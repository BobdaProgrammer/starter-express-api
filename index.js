const express = require('express')
const app = express()
app.all('/', (req, res) => {
let languages = {};
let starred = [];
let hours = {};
let days = {};
const urlParams = new URLSearchParams(window.location.search);
let token = urlParams.get("token");
let username = "";
let summary = "";

let results = {
  MUL: "",
  RS: "",
  TOC: "",
  DOC: "",
  PRM: "",
  NOC: 0,
};
//MUL = most used languages, RS = repo's starred, TOC = most common hours of commits(time of commits), Day of commits (most common days of commits), PRM = pull requests merged, NOC = number of contributions
//displaying the data
async function getContributions() {
  const headers = {
    Authorization: `bearer ${token}`,
  };
  const body = {
    query:
      "query {viewer {contributionsCollection {contributionCalendar {totalContributions}}}}",
  };
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    body: JSON.stringify(body),
    headers: headers,
  });
  const data = await response.json();
  results["NOC"] =
    data.data.viewer.contributionsCollection.contributionCalendar.totalContributions;
  return data;
}
function fetchMerged(link) {
  return fetch(link, {
    headers: {
      Authorization: `bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Network response was not ok, status: ${response.status}`
        );
      }

      return response.json();
    })
    .then((data) => {
      results["PRM"] = data["total_count"];
    })
    .catch((error) => {
      console.log("Fetch error: ", error);
    });
}
function fetchlanguage(link) {
  return fetch(link, {
    headers: {
      Authorization: `bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Network response was not ok, status: ${response.status}`
        );
      }

      return response.json();
    })
    .then((data) => {
      for (let key in data) {
        languages[key]
          ? (languages[key] += data[key])
          : (languages[key] = data[key]);
      }
    })
    .catch((error) => {
      console.log("Fetch error: ", error);
    });
}
function fetchStarred(link) {
  return fetch(link, {
    headers: {
      Authorization: `bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Network response was not ok, status: ${response.status}`
        );
      }

      return response.json();
    })
    .then((data) => {
      for (let key in data) {
        starred.push(data[key]["name"]);
      }
    })
    .catch((error) => {
      console.log("Fetch error: ", error);
    });
}
function getHourAndDay(link) {
  link = link.slice(0, link.length - 6);
  return fetch(link, {
    headers: {
      Authorization: `bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Network response was not ok, status: ${response.status}`
        );
      }

      return response.json();
    })
    .then((data) => {
      let daysOfWeek = [
        "Sunday",
        "Monday",
        "Tuesday",
        "wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      for (let key in data) {
        let date = new Date(data[key]["commit"]["committer"]["date"]);
        let hour = JSON.stringify(date.getHours()) + "T";
        let day = daysOfWeek[date.getDay()];
        hours[hour] ? (hours[hour] += 1) : (hours[hour] = 1);
        days[day] ? (days[day] += 1) : (days[day] = 1);
      }
    })
    .catch((error) => {
      console.log("Fetch error: ", error);
    });
}
  const urlParams = new URLSearchParams(window.location.search);
  token = process.env.GITHUB_ACCESS_TOKEN;
  let username;
  fetch("https://api.github.com/user",{
   headers:{
      Authorization: `bearer ${token}`,
   },
  })
  .then(response => response.json())
  .then(data => {
    console.log(data.login);
    // Extract the username from the response data
    username = data.login; // 'login' is the key for the username in the GitHub API response
  })
  .catch(error => {
    console.error('Error fetching user info:', error);
  });
  fetch("https://api.github.com/users/" + username + "/repos", {
    headers: {
      Authorization: `bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(
          `Network response was not ok, status: ${response.status}`
        );
      }

      return response.json();
    })
    .then((data) => {
      let promises = [];
      for (let repo in data) {
        promises.push(fetchlanguage(data[repo]["languages_url"]));
        promises.push(getHourAndDay(data[repo]["commits_url"]));
      }
      promises.push(getContributions());
      promises.push(
        fetchMerged(
          `https://api.github.com/search/issues?q=is:pr+author:${username}+is:merged`
        )
      );
      promises.push(
        fetchStarred(`https://api.github.com/users/${username}/starred`)
      );
      return Promise.all(promises);
    })
    .then(() => {
      let sortedLanguages = Object.entries(languages).sort(
        (a, b) => b[1] - a[1]
      );
      let sortedHours = Object.entries(hours).sort((a, b) => b[1] - a[1]);
      let sortedDays = Object.entries(days).sort((a, b) => b[1] - a[1]);
      let topLanguages = sortedLanguages
        .map((language) => language[0]);
      let topThreeHours = sortedHours
        .map((time) => time[0].replace("T", "") + ":00");
      results["MUL"] = topLanguages;
      results["RS"] = starred;
      results["TOC"] = topThreeHours;
      results["DOC"] = sortedDays;
        res.send(results)
    })
    .catch((error) => {
      console.log("Fetch error: ", error);
    });

})
app.listen(process.env.PORT || 3000)

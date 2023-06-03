require("dotenv").config();

const dayjs = require("dayjs");
var relativeTime = require("dayjs/plugin/relativeTime");
dayjs.extend(relativeTime);
var updateLocale = require("dayjs/plugin/updateLocale");
dayjs.extend(updateLocale);

dayjs.updateLocale("en", {
  relativeTime: {
    future: "in %s",
    past: "%s ago",
    s: "a few seconds",
    m: "a minute",
    mm: "%d min",
    h: "an h",
    hh: "%d hrs",
    d: "a day",
    dd: "%d days",
    M: "a month",
    MM: "%d months",
    y: "a year",
    yy: "%d years",
  },
});
const REALTIME_API_KEY = process.env.SL_REALTIME_API_KEY;
const SITE_ID = process.env.SL_SITE_ID;
const JOURNEY_DIRECTION = Number(process.env.SL_JOURNEY_DIRECTION);
const TIME_WINDOW_MINUTES = Number(process.env.TIME_WINDOW_MINUTES || 20);
const FETCH_INTERVAL_MS = Number(process.env.FETCH_INTERVAL_MS || 15000);
const REFRESH_INTERVAL_MS = Number(process.env.REFRESH_INTERVAL_MS || 5000);

const WALK_TIME_SECONDS = Number(process.env.WALK_TIME_SECONDS || 300);
const RUSH_SECONDS_GAINED = Number(process.env.RUSH_SECONDS_GAINED || 90);

async function fetchNextDeparture() {
  const url = new URL("https://api.sl.se/api2/realtimedeparturesV4.json");
  url.searchParams.set("key", REALTIME_API_KEY);
  url.searchParams.set("siteid", SITE_ID);
  url.searchParams.set("timewindow", TIME_WINDOW_MINUTES);
  url.searchParams.set("Bus", "false");

  const response = await fetch(url);
  if (!response.ok) throw Error("Request failed");
  const data = await response.json();

  const metros = data.ResponseData.Metros;
  const metrosRightDirection = metros.filter(
    (metroDeparture) =>
      isNaN(JOURNEY_DIRECTION) ||
      metroDeparture.JourneyDirection === JOURNEY_DIRECTION
  );
  return metrosRightDirection;
}

const decorateDepartures = (departures) =>
  (departures ?? {})
    .map((d) => ({
      ...d,
      expectedInSeconds: dayjs(d.ExpectedDateTime).diff(new Date(), "seconds"),
      scheduleDriftSeconds: dayjs(d.ExpectedDateTime).diff(
        d.TimeTabledDateTime,
        "seconds"
      ),
    }))
    .map((d) => ({
      ...d,
      secondsToSpare: d.expectedInSeconds - WALK_TIME_SECONDS,
      successProb: d.expectedInSeconds / WALK_TIME_SECONDS,
    }))
    .map((d) => ({
      ...d,
      successProbPow: Math.pow(d.successProb, 2),
      canMakeIt: d.secondsToSpare >= -RUSH_SECONDS_GAINED,
    }));

let departuresRaw = [];

const updateDepartures = () =>
  fetchNextDeparture()
    .then((d) => {
      departuresRaw = [...d];
      console.log("Updated departures", departuresRaw);
    })
    .catch((err) => {
      console.error("updateDepartures failed", err);
    });

const render = () => {
  const departures = decorateDepartures(departuresRaw);
  if (!departures.length)
    return `No departures within ${TIME_WINDOW_MINUTES} minutes`;
  const realisticDepartures = departures; //.filter((d) => d.canMakeIt);

  const lines = realisticDepartures.map((departure) => {
    const expectedTime = departure.ExpectedDateTime;
    const hurryStr =
      departure.successProbPow < 1
        ? departure.successProb < 0
          ? "😵"
          : "😱"
        : "👍";
    const timeMinutes = dayjs(expectedTime).fromNow(true);
    return `${hurryStr} ${timeMinutes} (${departure.Destination})`; /*, ${Math.round(
      departure.successProbPow * 100
    )}% doable)`;*/
  });

  return `<span style="font-size: 35px">${lines.join("\n")}</span>`;
};

setInterval(() => updateDepartures().catch(console.error), FETCH_INTERVAL_MS);
void updateDepartures().catch(console.error);

const express = require("express");
const app = express();

// respond with "hello world" when a GET request is made to the homepage
app.get("/", (req, res) => {
  console.log("GET /");
  const refreshScript = `<script>setInterval(() => window.location.reload(), ${REFRESH_INTERVAL_MS});</script>`;
  res.send(render() + refreshScript /*+ "<br/>" + new Date().toISOString()*/);
});

const port = process.env.PORT || 8000;
app.listen(port);
console.log("Listening on ", port);
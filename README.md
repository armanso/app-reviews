# App-Reviews

![NPM Version](https://img.shields.io/npm/v/app-reviews.svg) ![Downloads](https://img.shields.io/npm/dt/app-reviews.svg)  

App-Reviews is a nodejs app that monitors App Store and Google Play reviews.

This project is heavily inspired by [ReviewMe](https://www.npmjs.com/package/app-reviews).

# What changed?

* Using `axios` instead `request`.
* Refactor to have asynchronous code base.
* Give an option to be able to use any data source e.g. Firebase Storage

## Installation

```
npm install app-reviews
```

## Usage

Three functions need to be define to make this library work.

```typescript
const storePublishedReviewsList = async (reviews: PublishedReviews) => {
    writeFileSync("./published_reviews.json", JSON.stringify(reviews), { flag: 'w' })
}

const retrivePublishedReviewsList = async (): Promise<PublishedReviews> => {
    try {
        var source = readFileSync("./published_reviews.json", "utf8")
        return JSON.parse(source)
    } catch {
        return {}
    }
}

// by default generated messages are compatible with slack's message formatting.
const onNewMessageAvailable = async (messages: string[]) => {
    var requets = messages.map(message => axios.post(
        { SLACK_WEBHOOK },
        message)
    )
    await Promise.all(requets)
}
```

## Config

App-Review requires a config file. A simple config looks something like:

```typescript
const config = {
    apps: [
        { id: "[android-package-name]", showAppIcon: true, publisherKey: "./api-key.json" },
        { id: "[app-store-id]", showAppIcon: true, regions: ["us"] }
    ],
    storePublishedReviewsList,
    retrivePublishedReviewsList,
    onNewMessageAvailable
}
```

### Options

* **apps:** A list of apps to fetch reviews for. See App Options below

* **storePublishedReviewsList:** Function to store list of latest reviews list into the data source

* **retrivePublishedReviewsList:** Function to retrive list of latest reviews list from the data source

* **onNewMessageAvailable:** Function that receive list of new reviews message

### App options

* **appId:** The Android app package name, or the iOS app ID.

* **regions:** (iOS Only) The [ISO 3166-2](https://en.wikipedia.org/wiki/ISO_3166-2#Current_codes) regions to fetch reviews for (use `all` to include all regions)

* **appIcon:** An image url to use for the bot avatar

* **generateMessageFromReview:** (optional) Function that generate message for each review 

* **showAppIcon:** Determines if app icon will be displayed (overrides botIcon)

* **publisherKey:** (Android Only) The path to a Google Play Publisher private key (`.json` file). Used for accessing the Google Play Publisher API.

## Google Play Publisher Key

App-Reviews requires access to the Google Play Publisher API to fetch reviews. You need to supply App-Reviews with a Google Play Publisher API private key:

* Go to the Google Play Developer Console -> Settings -> API Access

* Create a Google Play Android Developer project

* Create a Service Account with "Service Accounts" -> "Service Account User" role

* Download the private key (`.json`)

* Supply the path to the private key in the `config.json`



 
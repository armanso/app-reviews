import { Data, AppStoreConfig, PublishedReviews } from "./global-types"
import axios from "axios"
import allRegions from './regions.json'

export default class AppStoreReviews {

    BASE_URL = "https://itunes.apple.com"
    STORE_NAME = "App Store"

    async fetch(config: AppStoreConfig, publishedReviews: PublishedReviews): Promise<Data> {
        let { id, regions } = config

        const appInformation = await this.fetchAppInformation(id)

        if (regions == 'all') {
            regions = allRegions
        }

        if (regions.length == 0) {
            throw "At least one region should be define in configuration"
        }

        const requests = (regions as string[]).map(region => this.fetchAppStoreReviews(id, config.pageRange || 5, region))
        const result = await Promise.all(requests)

        let reviews: Review[] = []
        var newReviews = reviews.concat(...result).filter((review) => {
            if (publishedReviews[id] !== undefined && publishedReviews[id].indexOf(review.id) >= 0) {
                return false
            }
            return true
        })

        var newReviewsMap: PublishedReviews = {}
        newReviewsMap[id] = newReviews.map(this.mapReviewId)

        return {
            messages: newReviews.map(review => {
                if (config.generateMessageFromReview !== undefined) {
                    return config.generateMessageFromReview.call(this, review, appInformation, config)
                } else {
                    return this.generateSlackMessage(review, appInformation, config)
                }
            }),
            newReviews: newReviewsMap
        }
    }

    async fetchAppInformation(appId: string): Promise<AppInformation> {
        const url = `${this.BASE_URL}/lookup?id=${appId}`
        try {
            const res = await axios.get(url) as AppInformationResponse
            const results = res.data.results

            if (results === null || results.length == 0) {
                throw `Couldn't find app[${appId}] information`
            }
            const result = results[0]

            return {
                appName: result.trackCensoredName,
                appIcon: result.artworkUrl100,
                appLink: result.trackViewUrl
            }

        } catch (err) {
            console.error(`Something went wrong, ${err}`)
            throw err
        }
    }

    async fetchAppStoreReviews(appId: string, pagesInRange: number, region: string) {
        let reviews: Review[] = []

        for (let page = 1; page <= pagesInRange; page++) {
            let pageReview = await this.fetchAppStoreReviewsByPage(appId, page, region)
            reviews = reviews.concat(pageReview)
        }

        return reviews
    }

    async fetchAppStoreReviewsByPage(appId: string, page: number, region: string): Promise<Review[]> {
        const url = `${this.BASE_URL}/${region}/rss/customerreviews/page=${page}/id=${appId}/sortBy=mostRecent/json`
        try {
            const res = await axios.get(url) as ReviewResponse
            var entries = res.data.feed.entry

            if (entries == null || entries.length == 0) {
                return []
            }

            return entries
                .filter(this.isAppInformationEntry)
                .reverse()
                .map((review) => this.parseAppStoreReview(review, region))

        } catch {
            return []
        }
    }

    mapReviewId(review: Review): string {
        return review.id
    }

    isAppInformationEntry = function (entry: ReviewEntry) {
        return !(entry && entry["im:name"])
    }

    parseAppStoreReview = (entry: ReviewEntry, region: string): Review => {
        return {
            id: entry.id.label,
            version: this.reviewAppVersion(entry),
            title: entry.title.label,
            text: entry.content.label,
            rating: this.reviewRating(entry),
            author: this.reviewAuthor(entry),
            link: this.reviewLink(entry),
            region
        }
    }

    reviewAppVersion = function (review: ReviewEntry): string {
        return review['im:version'] ? review['im:version'].label : ''
    }

    reviewRating = function (review: ReviewEntry): number {
        return review['im:rating'] && !isNaN(parseInt(review['im:rating'].label)) ? parseInt(review['im:rating'].label) : -1
    }

    reviewAuthor = function (review: ReviewEntry): string {
        return review.author ? review.author.name.label : ''
    }

    reviewLink = function (review: ReviewEntry): string {
        return review.author ? review.author.uri.label : ''
    }

    generateSlackMessage = (review: Review, appInformation: AppInformation, config: AppStoreConfig): string => {
        var stars = ""
        for (var i = 0; i < 5; i++) {
            stars += i < review.rating ? "★" : "☆"
        }

        var color = review.rating >= 4 ? "good" : (review.rating >= 2 ? "warning" : "danger")

        var text = ""
        text += review.text + "\n"

        var footer = ""
        if (review.version) {
            footer += " for v" + review.version
        }

        if (review.link) {
            footer += " - " + "<" + review.link + "|" + appInformation.appName + ", " + this.STORE_NAME + " (" + review.region + ") >"
        } else {
            footer += " - " + appInformation.appName + ", " + this.STORE_NAME + " (" + review.region + ")"
        }

        var title = stars
        if (review.title) {
            title += " – " + review.title
        }

        return JSON.stringify({
            "attachments": [
                {
                    "mrkdwn_in": ["text", "pretext", "title"],
                    "color": color,
                    "author_name": review.author,
                    "thumb_url": config.showAppIcon ? (appInformation.appIcon) : config.appIcon,
                    "title": title,
                    "text": text,
                    "footer": footer
                }
            ]
        })
    }
}

export type Review = {
    id: string,
    version: string,
    title: string,
    text: string,
    rating: number,
    author: string,
    link: string,
    region: string
}

type ReviewResponse = {
    data: {
        feed: {
            entry: ReviewEntry[]
        }
    }
}

type ReviewEntry = {
    'im:name': string
    'im:rating': Label
    'im:version': Label,
    id: Label,
    title: Label,
    content: Label
    author: {
        name: Label
        uri: Label
    }
}

type Label = {
    label: string
}

export type AppInformation = {
    appName: string,
    appIcon: string,
    appLink: string
}

type AppInformationResponse = {
    data: {
        results: Result[]
    }
}

type Result = {
    trackCensoredName: string,
    artworkUrl100: string,
    trackViewUrl: string
}
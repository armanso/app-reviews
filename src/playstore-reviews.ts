import { Data, PlayStoreConfig, PublishedReviews } from "./global-types"

import { google, androidpublisher_v3 } from "googleapis"
import { app, AppInformation } from "google-play-scraper"
import { get } from "android-versions"

export default class PlayStoreReviews {

    SCOPES = ['https://www.googleapis.com/auth/androidpublisher']
    STORE_NAME = "Play Store"

    async fetch(config: PlayStoreConfig, publishedReviews: PublishedReviews): Promise<Data> {
        let { id } = config

        const appInformation = await app({ appId: id })
        const result = await this.fetchPlayStoreReviews(id, config.publisherKey, config.verbose)

        let reviews: Review[] = []
        const newReviews = reviews.concat(...result).filter((review) => {
            return !(publishedReviews[id] !== undefined && publishedReviews[id].indexOf(review.id) >= 0)
        })

        const newReviewsMap: PublishedReviews = {}
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

    async fetchPlayStoreReviews(appId: string, publisherKey: string, verbose?: Boolean) {
        //read publisher json key
        var publisherJson
        try {
            publisherJson = JSON.parse(require('fs').readFileSync(publisherKey, 'utf8'))
        } catch (e) {
            if (verbose)
                console.warn(e)
                
            return []
        }

        try {
            const jwt = new google.auth.JWT(publisherJson.client_id, undefined, publisherJson.private_key, this.SCOPES, undefined)
            const res = await google.androidpublisher('v3').reviews.list({
                auth: jwt,
                packageName: appId
            })

            if (!res.data.reviews) {
                return []
            }

            return res.data.reviews.map((review) => this.parsePlayStoreReview(review, appId))
        } catch (e) {
            if (verbose)
                console.warn(e)
            return []
        }
    }

    mapReviewId(review: Review): string {
        return review.id
    }

    parsePlayStoreReview = (entry: androidpublisher_v3.Schema$Review, appId: string): Review => {
        const comment = entry.comments!![0].userComment!!

        return {
            id: entry.reviewId || "NO_REVIEW_ID",
            version: comment.appVersionName || "NO_APP_VERSION",
            versionCode: comment.appVersionCode || 0,
            text: comment.text || "NO TEXT",
            osVersion: comment.androidOsVersion,
            device: comment.deviceMetadata?.productName,
            rating: comment.starRating || 0,
            author: entry.authorName || "NO_AUTHOR_NAME",
            link: 'https://play.google.com/store/apps/details?id=' + appId + '&reviewId=' + entry.reviewId,
        }
    }

    generateSlackMessage = (review: Review, appInformation: AppInformation, config: PlayStoreConfig): string => {
        var stars = ""
        for (var i = 0; i < 5; i++) {
            stars += i < review.rating ? "★" : "☆"
        }

        const color = review.rating >= 4 ? "good" : (review.rating >= 2 ? "warning" : "danger")

        var text = ""
        text += review.text + "\n"

        var footer = ""
        if (review.version) {
            footer += " for v" + review.version + ' (' + review.versionCode + ') '
        }

        if (review.osVersion) {
            footer += ' Android ' + this.getVersionNameForCode(review.osVersion)
        }

        if (review.device) {
            footer += ', ' + review.device
        }

        if (review.link) {
            footer += " - " + "<" + review.link + "|" + appInformation.title + ", " + this.STORE_NAME + ">"
        } else {
            footer += " - " + appInformation.title + ", " + this.STORE_NAME
        }

        var title = stars

        return JSON.stringify({
            "attachments": [
                {
                    "mrkdwn_in": ["text", "pretext", "title", "footer"],

                    "color": color,
                    "author_name": review.author,

                    "thumb_url": config.showAppIcon ? (appInformation.icon) : config.appIcon,

                    "title": title,

                    "text": text,
                    "footer": footer
                }
            ]
        })
    }

    getVersionNameForCode = function (versionCode: number) {
        const version = get(versionCode)
        if (version != null) {
            return version.semver
        }

        return ""
    }
}

export type Review = {
    id: string,
    version: string,
    device: string | undefined | null
    versionCode: number,
    osVersion: number | undefined | null,
    text: string,
    rating: number,
    author: string,
    link: string,
}
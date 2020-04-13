import Reviews from '../reviews'
import { Config, PublishedReviews } from '../global-types'
import { readFileSync, writeFileSync } from 'fs'
import axios from "axios"

(async () => {
    const FILE_NAME = "./published_reviews.json"

    const storePublishedReviewsList = async (reviews: PublishedReviews) => {
        writeFileSync(FILE_NAME, JSON.stringify(reviews), { flag: 'w' })
    }

    const retrivePublishedReviewsList = async (): Promise<PublishedReviews> => {
        try {
            var source = readFileSync(FILE_NAME, "utf8")
            return JSON.parse(source)
        } catch {
            return {}
        }
    }

    const onNewMessageAvailable = async (messages: string[]) => {
        var requets = messages.map(message => {
            return axios.post(
                "[slack-webhook-url]",
                message
            )
        })

        await Promise.all(requets)
    }

    const config: Config = {
        apps: [
            { id: "package_name", showAppIcon: true, publisherKey: "[publisher-key.json]" },
            { id: "app_id", showAppIcon: true, regions: 'all' }
        ],
        storePublishedReviewsList,
        retrivePublishedReviewsList,
        onNewMessageAvailable
    }

    var reviews = new Reviews(config)
    await reviews.init()
})()



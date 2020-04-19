import { Config, PlayStoreConfig, AppStoreConfig } from './global-types'
import AppStoreReviews from './appstore-reviews'
import PlayStoreReviews from './playstore-reviews'

export default class Reviews {

    private config: Config
    private appStoreReviews: AppStoreReviews
    private playStoreReviews: PlayStoreReviews

    constructor(config: Config) {
        this.config = config
        this.appStoreReviews = new AppStoreReviews()
        this.playStoreReviews = new PlayStoreReviews()

        if (config.reviewLimit !== undefined) {
            config.reviewLimit = 100
        }
    }

    async init() {
        var publishedReviews = await this.config.retrivePublishedReviewsList()

        const requests = this.config.apps.map(app => {
            const storeType = (app.id.indexOf("\.") > -1) ? StoreType.GOOGLE_PLAY : StoreType.APP_STORE
            if (this.config.verbose === undefined)
                app.verbose = false
                
            if (storeType == StoreType.GOOGLE_PLAY) {
                return this.playStoreReviews.fetch(app as PlayStoreConfig, publishedReviews)
            } else if (storeType == StoreType.APP_STORE) {
                return this.appStoreReviews.fetch(app as AppStoreConfig, publishedReviews)
            }
        })

        const results = await Promise.all(requests)
        var messagesToSend: string[] = []
        results.forEach(result => {
            if (result !== undefined) {
                for (let id in result.newReviews) {
                    if (publishedReviews[id] === undefined) {
                        // first time
                        publishedReviews[id] = []
                    }

                    // prevent to have too many items in list!
                    if (this.config.reviewLimit !== undefined && publishedReviews[id].length > this.config.reviewLimit) {
                        publishedReviews[id] = publishedReviews[id].slice(0, this.config.reviewLimit)
                    }

                    publishedReviews[id].unshift(...result.newReviews[id].reverse())
                }

                if (result.messages.length > 0) {
                    messagesToSend = messagesToSend.concat(result.messages)
                }
            }
        })

        await this.config.onNewMessageAvailable.call(this, messagesToSend)
        await this.config.storePublishedReviewsList.call(this, publishedReviews)
    }
}

enum StoreType {
    APP_STORE,
    GOOGLE_PLAY
}

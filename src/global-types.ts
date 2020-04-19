import { Review as AppStoreReview, AppInformation as AppStoreAppInformation } from "./appstore-reviews"
import { Review as PlayStoreReview } from "./playstore-reviews"
import { AppInformation as PlayStoreAppInformation } from "google-play-scraper"

export type Config = {
    apps: (AppStoreConfig | PlayStoreConfig)[]
    storePublishedReviewsList: StorePublishedReviews,
    retrivePublishedReviewsList: RetrivePublishedReviews,
    onNewMessageAvailable: NewMessageAvailble,
    reviewLimit?: number,
    verbose?: boolean
}

type StoreConfig = {
    showAppIcon?: boolean,
    appIcon?: string,
    verbose?: boolean
}

export interface AppStoreConfig extends StoreConfig {
    id: string,
    generateMessageFromReview?: AppStoreMessageGenerator,
    pageRange?: number
    regions: string[] | "all"
}

export interface PlayStoreConfig extends StoreConfig {
    id: string,
    generateMessageFromReview?: PlayStoreMessageGenerator,
    publisherKey: string
}

export type PublishedReviews = {
    [appId: string]: string[]
}

export type Messages = string[]

export type Data = {
    newReviews: PublishedReviews,
    messages: Messages
}

export type StorePublishedReviews = (reviews: PublishedReviews) => Promise<void>

export type NewMessageAvailble = (messages: string[]) => Promise<void>

export type RetrivePublishedReviews = () => Promise<PublishedReviews>

export type AppStoreMessageGenerator = (review: AppStoreReview, appInformation: AppStoreAppInformation, config: AppStoreConfig) => string

export type PlayStoreMessageGenerator = (review: PlayStoreReview, appInformation: PlayStoreAppInformation, config: PlayStoreConfig) => string
declare module 'google-play-scraper' {
    export type AppInformation = {
        title: string,
        icon: string
    }

    type App = {
        appId: String
    }

    function app(app: App): Promise<AppInformation>
}

declare module 'android-versions' {
    type Version = {
        semver: string
    }

    function get(version: number): Version
}
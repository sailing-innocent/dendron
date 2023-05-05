export declare class DateFormatUtil {
    /**
     * Formats the date using short letter description for the month
     * (Example 'Dec' for 'December), so that there is no ambiguity on the dates
     * for different locales.
     *
     * Ambiguity to avoid: US is month/day/year while most of the world is day/month/year.
     * */
    static formatDate(millisSinceEpoch: number): string;
}

/** One group in an A/B test. Describes one group of users. */
type ABTestGroup<GroupNames> = {
    /** Name for the group. */
    name: GroupNames;
    /** The likelihood of a user to be in this group. The number should be
     * positive and nonzero. The weight is calculated in relation to the weight of other groups
     * in the A/B test. */
    weight: number;
};
/** One A/B test.
 *
 * Warning! Test names **must** stay consistent between Dendron releases, or
 * users will see the tests flip/flop.
 *
 * Can test two or more groups.
 *
 * ```ts
 * const EXAMPLE_TEST = new ABTest("example", [
 *   {
 *     name: "user with example",
 *     weight: 2,
 *   },
 *   {
 *     name: "users without example",
 *     weight: 1,
 *   },
 * ]);
 *
 * EXAMPLE_TEST.getUserGroup("anonymous user UUID");
 * ```
 CURRENT_AB_TESTS|* ^85lbm3148c1a
 */
export declare class ABTest<GroupNames> {
    private _name;
    get name(): string;
    private groups;
    constructor(name: string, groups: ABTestGroup<GroupNames>[]);
    /** Given the user ID, find which group of the AB test the user belongs to. */
    getUserGroup(userId: string): GroupNames;
}
export {};

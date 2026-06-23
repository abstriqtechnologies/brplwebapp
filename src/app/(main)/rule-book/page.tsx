import PageBanner from "@/components/PageBanner";
import SEO from "@/components/SEO";
import { decodeHtmlEntities } from "@/utils/htmlHelper";
import { SafeHtml } from "@/components/SafeHtml";
import { getSiteContext, getLegal } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";

export const dynamic = "force-dynamic";

export default async function RuleBook() {
    const [ctx, legal] = await Promise.all([
        getSiteContext(),
        getLegal(),
    ]);

    const renderStaticContent = () => (
        <>
            <h1 className="text-3xl md:text-4xl font-bold font-display text-[#111a45] mb-8">BRPL Rule Book</h1>
            <div className="space-y-6 text-sm md:text-[1.05rem] leading-relaxed text-slate-600">
                <p>
                    The Beyond Reach Premier League (BRPL) marks a new chapter in India&apos;s cricketing evolution. It&apos;s a league designed to discover talent, inspire communities, and redefine fast-format cricket. With a strong focus on accessibility, integrity, and innovation, BRPL brings together a nationwide talent pool, zonal representation, and the electrifying pace of T10 cricket.
                </p>
                <p>
                    This Rule Book establishes the framework that governs every aspect of the league, from player eligibility and team formation to match regulations, disciplinary codes, and competitive standards. Every rule has been crafted to ensure transparency, fairness, and a world-class playing environment.
                </p>
                <p>
                    We look forward to building a league that unites players, fans, and communities under one dream: a cricketing platform truly made for every Indian.
                </p>
                <p className="font-bold text-slate-900">Welcome to BRPL.</p>
                <p className="italic text-slate-500">— BRPL Organising Committee</p>
            </div>

            <div className="mt-12 space-y-10">
                {/* Vision & Identity */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Vision &amp; Identity</h2>
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">Our Vision</h3>
                            <p className="text-slate-600 leading-relaxed">To build India&apos;s most inclusive and impactful T10 cricket platform. One that empowers grassroots talent, unites communities, and celebrates the true spirit of the game in every corner of the nation.</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">Our Identity</h3>
                            <p className="text-slate-600 leading-relaxed">The Beyond Reach Premier League (BRPL) is a movement shaped by opportunity, accessibility, and ambition. BRPL represents every aspiring cricketer who dreams beyond limitations, every fan who believes in the power of sport, and every community that lives and breathes cricket culture. Through our zonal structure, professional pathways, and high-energy T10 format, we aim to create a league that feels authentic, relatable, and proudly rooted in India&apos;s cricketing history.</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">Core Pillars of the BRPL Identity</h3>
                            <div className="space-y-4 pl-4 border-l-2 border-slate-100">
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-1">Inclusivity &amp; Equal Opportunity</h4>
                                    <p className="text-slate-600 leading-relaxed">A league where players from all backgrounds, rural, urban, privileged, or underprivileged, receive a fair chance to compete and shine.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-1">Community-Centric Approach</h4>
                                    <p className="text-slate-600 leading-relaxed">Deep engagement with local communities, schools, and grassroots to strengthen regional pride and build a loyal fan culture.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-1">Innovation &amp; Entertainment</h4>
                                    <p className="text-slate-600 leading-relaxed">A dynamic T10 format, exciting X-Factor rules, and celebrity mentors that ensure every match is fast, unpredictable, and thrilling.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-1">Integrity &amp; Fair Play</h4>
                                    <p className="text-slate-600 leading-relaxed">Transparent processes in trials, auctions, and matches to uphold the highest standards of professionalism and sportsmanship.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Introduction */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Introduction</h2>
                    <p className="text-slate-600 mb-4 leading-relaxed">The Beyond Reach Premier League (BRPL) is India&apos;s newest T10 cricket platform dedicated to empowering grassroots talent through a professional league ecosystem. This Rulebook and Match Operations Manual establishes the standards, procedures, and regulations that govern every aspect of BRPL.</p>
                    <p className="text-slate-600 mb-4 leading-relaxed">Players entering BRPL will begin their journey through the <span className="font-bold text-slate-900">Registration and Trial process</span>, held across multiple cities during June and July 2026. Shortlisted players will advance to the <span className="font-bold text-slate-900">BRPL Auction</span>, where franchises representing India&apos;s key zones will bid to form their squads. Players selected in the auction will compete in the main BRPL Season.</p>
                    <p className="text-slate-600 leading-relaxed">Players who are not picked during the auction will still continue their journey in the BRPL ecosystem. They will join their respective <span className="font-bold text-slate-900">Zonal Talent Pools</span>, ensuring that every participant remains actively involved and retains opportunities for future seasons. Zonal matches and ongoing scouting initiatives will give these players continued exposure, skill development, and a pathway to be reconsidered in subsequent BRPL seasons.</p>
                </section>

                {/* Match Structure */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Match Structure</h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li><span className="font-bold text-slate-900">Overs per innings:</span> 10</li>
                        <li><span className="font-bold text-slate-900">Balls per over:</span> 6 legal deliveries</li>
                        <li><span className="font-bold text-slate-900">Innings Break:</span> Mandatory 10-minute interval between innings</li>
                        <li><span className="font-bold text-slate-900">Match Duration:</span> Approx. 60–75 minutes per innings</li>
                    </ul>
                </section>

                {/* Team Composition */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Team Composition</h2>
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">Squad Requirements</h3>
                            <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
                                <li>Each BRPL franchise must register a squad comprising 16 to 20 players. (11 in the Playing XI + 5 Substitutes + 4 in the dressing room)</li>
                                <li>For zonals, each team can have a squad of 16 players (11 in the Playing XI + 5 Substitutes)</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">Playing XI</h3>
                            <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
                                <li>Teams must submit their final Playing XI to the Match Referee prior to the toss.</li>
                                <li>Once submitted, the Playing XI cannot be changed except under approved medical grounds.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">Substitution Rules</h3>
                            <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
                                <li>No rolling substitutions are permitted.</li>
                                <li>Substitutions are allowed only for injuries and must be approved by the Match Referee.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">Support Staff</h3>
                            <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
                                <li>For the main season, each team can have a maximum of 5-9 officials (Coach, Team Manager, Trainer, Physiotherapist, Video Analyst, Assistant Coach, Mentor, Mental Trainer, Masseur)</li>
                                <li>For zonals, each team can have a maximum of 2 officials.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Impact Player Rule */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Impact Player Rule</h2>
                    <p className="text-slate-600 mb-4 leading-relaxed">BRPL allows each team to use one Impact Player during the match for strategic advantage.</p>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">Key Points:</h3>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed mb-4">
                        <li>Teams must name 5 substitutes after the toss.</li>
                        <li>1 Impact Player may replace any player from the Playing XI.</li>
                        <li>The Impact Player can bat and bowl (full 2 overs).</li>
                        <li>The replaced player cannot return to the match.</li>
                        <li>Only 11 players may bat in total.</li>
                    </ul>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">When It Can Be Used:</h3>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
                        <li>Before a new innings begins</li>
                        <li>After a wicket falls</li>
                        <li>At the end of an over</li>
                        <li>When a batter retires</li>
                    </ul>
                </section>

                {/* Ace Card Rule */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Ace Card Rule</h2>
                    <p className="text-slate-600 mb-4 leading-relaxed">The Ace Card allows one dismissed batsman to bat again.</p>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">How It Works:</h3>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed mb-4">
                        <li>Activating the Ace Card deducts 20 runs from the team&apos;s current score.</li>
                        <li>The selected batsman may then return to bat.</li>
                        <li>The match continues from the adjusted score.</li>
                    </ul>
                    <p className="text-slate-600 leading-relaxed bg-blue-50 p-4 rounded-xl border border-blue-100"><span className="font-bold text-slate-900">Example:</span> If the team is 100/5, using the Ace Card makes it 80/5, and the chosen batsman re-enters.</p>
                </section>

                {/* Tournament Structure */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Tournament Structure</h2>
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">A. BRPL Main Tournament</h3>
                            <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
                                <li>The BRPL Season will follow a league-stage round-robin format, ensuring every team competes against all others.</li>
                                <li>The top four teams based on points will qualify for the playoffs.</li>
                                <li>30+ league matches, followed by two semifinals and one grand final, will determine the BRPL Champion.</li>
                                <li>Each match will include a 10-minute innings break.</li>
                                <li>In case of a tie on points, Net Run Rate (NRR) will decide standings.</li>
                                <li>Teams will announce their squads in advance and begin training as per the official league schedule.</li>
                                <li>Teams will be announced in advance as per the fixtures drawn.</li>
                                <li>The tournament shall strictly follow the rules, guidelines, and match operations defined in this Rulebook.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">B. Trials</h3>
                            <p className="text-slate-600 mb-3 leading-relaxed">The following will apply to all BRPL trial rounds for the 18–40 age category:</p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed mb-4">
                                <li>Players need to register themselves before the trial dates.</li>
                                <li>Trial dates will be officially announced on the BRPL platform.</li>
                                <li>Trials will be conducted across India to shortlist players for the Auction round.</li>
                                <li>Wicketkeepers will be evaluated by a dedicated Selection Panel.</li>
                                <li>Players appearing for Trials will be provided with basic amenities.</li>
                                <li>Trials will follow BRPL-approved match setup and scoring rules.</li>
                            </ul>
                            <h4 className="font-bold text-slate-900 mb-2">Trial Format</h4>
                            <div className="pl-4 border-l-2 border-slate-100 space-y-4">
                                <div>
                                    <p className="font-bold text-slate-900 mb-1">For Batsmen:</p>
                                    <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                        <li>Each registered batsman will face 6 legitimate deliveries.</li>
                                        <li>Scoring 16 runs or more qualifies the batsman for the next round.</li>
                                    </ul>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 mb-1">For Bowlers:</p>
                                    <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                        <li>Each bowler will deliver 6 legitimate balls.</li>
                                        <li>The bowler must either dismiss the batsman or restrict him from scoring 16 runs to qualify.</li>
                                    </ul>
                                </div>
                            </div>
                            <p className="text-slate-600 mt-4 leading-relaxed">BRPL will compile trial results and publish the shortlisted players for Auction within 30 days of each trial.</p>
                        </div>
                    </div>
                </section>

                {/* Field Dimensions */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Field Dimensions</h2>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed mb-6">
                        <li><span className="font-bold text-slate-900">Playing Surface:</span> Natural surfaces only.</li>
                        <li><span className="font-bold text-slate-900">Pitch Length:</span> Standard 22 yards.</li>
                        <li><span className="font-bold text-slate-900">Field Diameter:</span> 50–60 meters, depending on venue conditions.</li>
                        <li><span className="font-bold text-slate-900">Boundary Markings:</span> Clearly visible colored boundary rope; must remain equidistant as far as possible.</li>
                        <li><span className="font-bold text-slate-900">Inner Circle (Optional):</span> 30-yard radius if implemented; rules for field placement will be communicated separately.</li>
                    </ul>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">BRPL Standard Ground Measurements</h3>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed mb-6">
                        <li>Total playing area: 75 meters in diameter.</li>
                        <li>Boundary distance: 1st boundary rope at 55m for 6 runs and a second boundary rope at 75m for 8 runs.</li>
                        <li>Pitch width: 8 ft (2.44 meters).</li>
                        <li>Pitch material: Clay/turf, with optional carpet matting for bounce consistency.</li>
                    </ul>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">Crease Markings</h3>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed mb-6">
                        <li>Bowling crease: 1.22 meters (4 ft) ahead of the stumps.</li>
                        <li>Popping crease: 1.22 meters ahead of the bowling crease.</li>
                        <li>Return crease: 1.32 meters from each stump.</li>
                    </ul>
                    <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">Additional Field Setup</h3>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
                        <li>Side screens: Minimum 10 ft high behind the bowler&apos;s end.</li>
                        <li>Dugouts: Positioned 10 meters from either side of the pitch.</li>
                        <li>Spectator area: Beyond the 25-meter boundary rope.</li>
                        <li>Powerplay (Optional): A 15-meter arc with limited fielders for the first 3 overs.</li>
                    </ul>
                </section>

                {/* Match Officials */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Match Officials and Their Powers</h2>
                    <div className="space-y-4 pl-4 border-l-2 border-slate-100">
                        <div>
                            <h3 className="font-bold text-slate-900 mb-1 text-lg font-display">Umpires</h3>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                <li>Two official umpires from the BRPL Umpiring Panel will officiate each match.</li>
                                <li>Their decisions are final except in rare cases, such as scoring errors.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-1 text-lg font-display">Third Umpire</h3>
                            <p className="text-slate-600">May be used for run-outs, stumpings, boundary checks, and similar decisions.</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-1 text-lg font-display">Scorer</h3>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                <li>The official scorer will update match data through the BRPL-approved scoring system.</li>
                                <li>The scorer&apos;s entries are treated as the official match record.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-1 text-lg font-display">Match Referee</h3>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                <li>Oversees all match operations, including Code of Conduct enforcement.</li>
                                <li>Has authority to rule on weather issues, delays, injuries, time-wasting, or disciplinary matters.</li>
                                <li>Can award the match to the opposition in extreme cases (e.g., walkovers, rule violations).</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-1 text-lg font-display">Intervention Powers</h3>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                <li>Match officials may suspend or delay play due to an unsafe pitch or weather.</li>
                                <li>Umpires may enforce penalties for slow over rates (including penalty runs).</li>
                                <li>The Match Referee may disallow participation of any person in breach of league conduct rules.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Match Day Protocol */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Match Day Protocol</h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li>All players must report to the venue at least 80 minutes before the scheduled start time.</li>
                        <li>The toss will be conducted 30 minutes prior to the match.</li>
                        <li>Umpires and scorers will be appointed by the BRPL Official Panel.</li>
                        <li>A designated Match Referee will supervise all match operations.</li>
                        <li>Each team must arrive with a complete match kit, including jerseys, bibs, first-aid supplies, match balls, and drinking water.</li>
                    </ul>
                </section>

                {/* Code of Conduct */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Code of Conduct</h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li>Players shall not dispute or show dissent toward umpiring decisions.</li>
                        <li>The use of foul or abusive language is strictly prohibited.</li>
                        <li>Physical or verbal intimidation will not be tolerated.</li>
                        <li>All decisions made by match officials are final and binding.</li>
                        <li>Any breach of conduct may result in warnings, suspensions, or expulsion from the league.</li>
                    </ul>
                </section>

                {/* Ethics & Integrity */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Ethics &amp; Integrity Unit</h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li>BRPL will constitute an independent Ethics and Integrity Unit.</li>
                        <li>The unit will monitor all activities related to match-fixing, gambling, or unethical conduct.</li>
                        <li>An anonymous reporting channel will be provided for whistleblowers.</li>
                        <li>Attendance at the annual integrity workshop is required for all players, franchise owners, and key staff.</li>
                    </ul>
                </section>

                {/* Anti-Doping */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Anti-Doping Policy</h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li>BRPL enforces a strict anti-doping code aligned with international best practices.</li>
                        <li>Players may be selected for random drug testing during the season.</li>
                        <li>The use of performance-enhancing drugs or banned substances will result in immediate suspension and possible expulsion.</li>
                    </ul>
                </section>

                {/* Injury & Substitute */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Injury &amp; Substitute Policy</h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li>Teams may nominate one substitute for concussion or serious injury, subject to the Match Referee&apos;s approval.</li>
                        <li>All injuries must be assessed by the team&apos;s medical staff and supported by an official medical report.</li>
                        <li>No replacement is allowed without the explicit sanction of the Match Referee.</li>
                    </ul>
                </section>

                {/* Rain / Interruptions */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Rain Or Unforeseen Interruptions</h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li>A minimum of 3 overs per side is required for a match to be considered valid.</li>
                        <li>The DLS method or simplified system will be applied in shortened matches.</li>
                        <li>In cases of abandonment or inconclusive results, the Match Referee&apos;s decision will be final.</li>
                    </ul>
                </section>

                {/* Franchise & Sponsorship */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Franchise &amp; Sponsorship Guidelines</h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li>All franchises must comply with BRPL&apos;s branding and sponsorship guidelines.</li>
                        <li>Sponsor logos may appear on team apparel only as per league-approved placements.</li>
                        <li>Advertising of alcohol, tobacco, betting, or similar categories is strictly prohibited.</li>
                    </ul>
                </section>

                {/* Media & Broadcast */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Media &amp; Broadcast</h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li>Players must be available for all official media duties, interviews, and interactions.</li>
                        <li>Team owners and head coaches may be required to attend press conferences.</li>
                        <li>Mobile live streaming must follow BRPL&apos;s broadcast rights framework and may not conflict with official coverage.</li>
                    </ul>
                </section>

                {/* Technology & Data */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Technology &amp; Data Usage</h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li>Real-time score updates are mandatory through the Official BRPL App.</li>
                        <li>An approved analytics dashboard will be provided to coaches and league officials.</li>
                        <li>Unauthorized video recording, live streaming, or use of match analytics/player data is strictly forbidden.</li>
                    </ul>
                </section>

                {/* Trophies & Awards */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Trophies &amp; Awards</h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li><span className="font-bold text-slate-900">Champion&apos;s Trophy:</span> Awarded to the BRPL Season Champion team.</li>
                        <li><span className="font-bold text-slate-900">Player of the Tournament:</span> For the most consistent all-round performer.</li>
                        <li><span className="font-bold text-slate-900">Best Batsman / Best Bowler / Fair Play Award:</span> Honouring excellence, discipline, and sportsmanship.</li>
                        <li><span className="font-bold text-slate-900">Emerging Talent Award:</span> Recognising the most promising new player during the season.</li>
                    </ul>
                </section>

                {/* Disputes & Appeals */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Disputes &amp; Appeals</h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li>Any complaint or dispute must be submitted in writing within 24 hours of the incident.</li>
                        <li>The BRPL Rules &amp; Redressal Committee will handle all standard appeals.</li>
                        <li>Issues related to indiscipline will be directed to the BRPL Disciplinary Committee.</li>
                        <li>Allegations of match-fixing or unethical influence will be escalated to the BRPL Ethics &amp; Integrity Committee.</li>
                        <li>Allegations related to doping or banned substances will be reviewed by the BRPL Anti-Doping &amp; Wellness Committee.</li>
                        <li>All committee decisions will be final and binding.</li>
                    </ul>
                </section>

                {/* Governing Body */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Governing Body &amp; Amendments</h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li>The BRPL Organising Committee has the highest governing authority over all league matters.</li>
                        <li>This Rulebook is subject to review and amendment at the end of each season or as needed, after a minimum two-day written notice.</li>
                    </ul>
                </section>

                {/* League Identity */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">League Identity &amp; Positioning</h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li>The league&apos;s tagline celebrates cricket as &quot;Bharat ki League, Bharat ka Sapna,&quot; a platform where any Indian with passion can aspire to play.</li>
                        <li>BRPL retains full ownership and rights over its name, logo, branding, audiovisual content, team/player data, and all commercial assets.</li>
                        <li>Participating franchises are custodians of BRPL&apos;s core values: Inclusivity, Community Development, Integrity, Excitement, and Sustainability.</li>
                        <li>Every franchise may craft its unique identity while staying aligned with the league&apos;s mission of nurturing grassroots talent.</li>
                        <li>All BRPL brand guidelines for logo usage and media collateral must be followed exactly as issued by the league.</li>
                        <li>Any unauthorized reproduction, misrepresentation, or commercial exploitation of the BRPL identity will invite legal and financial repercussions.</li>
                    </ul>
                </section>

                {/* Health, Wellness & Sportsmanship */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Health, Wellness &amp; Sportsmanship</h2>
                    <p className="text-slate-600 mb-4 leading-relaxed">BRPL acknowledges that a player&apos;s physical, mental, and emotional well-being directly impacts performance and the spirit of the game. To maintain a nurturing and safe environment:</p>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li><span className="font-bold text-slate-900">Player well-being:</span> Teams must ensure players are well-rested, hydrated, and receive access to basic medical and recovery care. Warm-ups, cooldowns, and healthy nutrition practices are strongly encouraged.</li>
                        <li><span className="font-bold text-slate-900">Mental health support:</span> A mental health resource person will be available on call to assist players with performance pressure, anxiety, or stress. All consultations will remain confidential.</li>
                        <li><span className="font-bold text-slate-900">Education sessions:</span> Workshops on anti-doping, ethics, sportsmanship, and wellness will be conducted during the season. Attendance is mandatory for all players and staff.</li>
                        <li><span className="font-bold text-slate-900">Respect for all:</span> Players, staff, spectators, and officials must maintain an atmosphere of respect. Discriminatory remarks or behaviour will have zero tolerance.</li>
                        <li><span className="font-bold text-slate-900">Spirit of the game:</span> BRPL promotes fairness, passion, and camaraderie. We value effort, discipline, and sportsmanship.</li>
                    </ul>
                </section>

                {/* Fan Code of Conduct */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Fan Code of Conduct</h2>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li>Spectators must show respect, discipline, and sporting behaviour at all times.</li>
                        <li>Abusive chants, discriminatory comments, or physical altercations will lead to removal from the venue.</li>
                        <li>Fans must respect all players, officials, and opposing team supporters.</li>
                        <li>Weapons, alcohol, narcotics, fireworks, and other banned items are strictly prohibited inside the venue.</li>
                    </ul>
                </section>

                {/* Equipment Standards */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Equipment Standards</h2>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
                        <li><span className="font-bold text-slate-900">Ball:</span> BRPL-approved ball; no modification unless league-approved.</li>
                        <li><span className="font-bold text-slate-900">Bat:</span> Any commercially available cricket bat suitable for T10 cricket.</li>
                        <li><span className="font-bold text-slate-900">Protective gear:</span> Gloves and abdomen guards are recommended; helmets and pads are optional.</li>
                        <li><span className="font-bold text-slate-900">Team uniform:</span> All players must wear official BRPL-approved jerseys with printed names and numbers.</li>
                    </ul>
                </section>

                {/* Medical Guidelines */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Medical Guidelines</h2>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
                        <li>Each venue must maintain a first-aid kit and a designated medical contact available on call.</li>
                        <li>Ice packs, antiseptics, hydration salts, and basic medical supplies must always be accessible.</li>
                        <li>For high-intensity matches, playoffs, or finals, an ambulance or emergency transport arrangement is mandatory.</li>
                        <li>All injuries must be officially recorded in the Match Referee&apos;s Injury Report.</li>
                    </ul>
                </section>

                {/* Security & Emergency */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Security &amp; Emergency Protocols</h2>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
                        <li>All venues must ensure secure entry/exit points and proper safety checks for players and spectators.</li>
                        <li>In case of emergencies (weather disruptions, medical crises, or crowd issues), the Match Referee may suspend or abandon the match after consulting with local authorities.</li>
                        <li>Venues must follow fire-safety compliance and maintain a clear evacuation plan.</li>
                        <li>Any suspicious behaviour must be reported immediately to BRPL officials.</li>
                    </ul>
                </section>

                {/* Match Operations Manual */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Match Operations Manual</h2>
                    <p className="text-slate-600 mb-6 leading-relaxed">The BRPL Match Operations Manual forms a crucial part of this Rulebook. The manual outlines step-by-step procedures for venue preparation, match-day execution, and responsibilities of all stakeholders involved in BRPL and its Zonal tournaments.</p>

                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">A. Pre-Match Operations</h3>
                            <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
                                <li>Ground inspection, boundary setup, and pitch assessment must be completed at least 2 hours before the scheduled start.</li>
                                <li>Match officials will receive a match checklist, rules brief, and operational updates from the Venue Coordinator.</li>
                                <li>All match essentials like team kits, match balls, scorekeeping devices, etc., must be placed 45 minutes before the toss.</li>
                                <li>The Match Referee should ensure team sheets and Playing XIs are submitted on time.</li>
                                <li>Technical checks for live scoring, digital systems, and broadcasting setups (if applicable) must be completed before players enter the field.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">B. Match Execution Protocol</h3>
                            <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
                                <li>Matches must start exactly as per the scheduled timing.</li>
                                <li>Live scoring must be updated through the BRPL scoring system and verified by both umpires.</li>
                                <li>Drinks breaks are permitted only with approval from the Match Referee.</li>
                                <li>Umpires must wear BRPL-approved uniforms and carry official signaling tools.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">C. Post-Match Procedures</h3>
                            <ul className="list-disc pl-6 space-y-2 text-slate-600 leading-relaxed">
                                <li>All match officials must complete and submit the official match report within 1 hour of match completion.</li>
                                <li>Teams must vacate dugout areas and provide feedback to the Venue Coordinator, if required.</li>
                                <li>Highlight reels, scorecards, and match statistics must be uploaded to the BRPL platform within 3 hours after the match.</li>
                                <li>Any injury reports, disciplinary matters, or code-of-conduct violations must be reported immediately to the BRPL League Office.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">D. Roles and Responsibilities</h3>
                            <div className="pl-4 border-l-2 border-slate-100 space-y-3">
                                <div><span className="font-bold text-slate-900">Venue Coordinator:</span> <span className="text-slate-600">Responsible for all on-ground logistics, readiness, player facilities, and operational flow for the match day.</span></div>
                                <div><span className="font-bold text-slate-900">Match Referee:</span> <span className="text-slate-600">Ensures adherence to BRPL rules and handles conduct issues.</span></div>
                                <div><span className="font-bold text-slate-900">Umpires:</span> <span className="text-slate-600">Adjudicate all on-field events in accordance with BRPL&apos;s guidelines.</span></div>
                                <div><span className="font-bold text-slate-900">Team Manager:</span> <span className="text-slate-600">Ensures team compliance with protocols, punctual submission of documents, and coordination with league officials.</span></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Trials Operations Manual */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Trials Operations Manual</h2>

                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">1. Objective</h3>
                            <p className="text-slate-600 leading-relaxed">The BRPL Trials Operations Manual ensures a transparent and standardized selection process for spotting cricketing talent across India. It provides operational clarity for trial organizers, coaches, selectors, scouts, and players participating in BRPL&apos;s nationwide trials.</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">2. Scope</h3>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                <li>BRPL Organizing Committee</li>
                                <li>Zonal Coordinators &amp; Trial City Heads</li>
                                <li>Selectors, Scouts &amp; Coaches</li>
                                <li>Registered Players</li>
                                <li>Support Staff &amp; Match Officials</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">3. Pre-Trial Preparations</h3>
                            <div className="space-y-4 pl-4 border-l-2 border-slate-100">
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-1">3.1 Venue Setup</h4>
                                    <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                        <li>Follow BRPL-approved field layout and safety guidelines.</li>
                                        <li>Clearly mark the pitch, boundaries, dugouts, scorer&apos;s desk, and viewing areas.</li>
                                        <li>Ensure PA system, first-aid, water stations, and shade structures are in place.</li>
                                        <li>Install BRPL branding elements at designated points.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-1">3.2 Equipment &amp; Logistics</h4>
                                    <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                        <li>Adequate supply of BRPL match-approved cricket balls.</li>
                                        <li>Player bibs or jerseys with registration numbers.</li>
                                        <li>Score sheets, evaluation forms, cones, stumps, and timing devices.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-1">3.3 Registration Requirements</h4>
                                    <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                        <li>Players must register online; on-ground registration is allowed only if slots remain.</li>
                                        <li>Players must submit valid age and ID proof.</li>
                                        <li>Each player will receive a registration number and be assigned to a trial group.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">4. Conduct of Trials</h3>
                            <p className="text-slate-600 mb-3">Trials follow a T10-style skills assessment format. No. of qualification rounds depends on the total registrations for the venue.</p>
                            <div className="space-y-4 pl-4 border-l-2 border-slate-100">
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-1">Batting Rules</h4>
                                    <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                        <li>Each batsman faces 6 legitimate deliveries.</li>
                                        <li>Scoring 16 runs or more qualifies the batsman for the next round.</li>
                                        <li>If the batsman is dismissed, he is disqualified, and the bowler qualifies.</li>
                                        <li>Wides/no-balls do not count toward the batsman&apos;s score; no-balls grant a free hit.</li>
                                        <li>At a time, up to three batters may rotate sequentially to optimize time.</li>
                                        <li>Ground dimensions may vary based on local availability; players will be informed verbally prior to trials.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-1">Bowling Rules</h4>
                                    <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                        <li>The bowler must either dismiss the batsman or prevent him from scoring 16 runs.</li>
                                        <li>All wides and no-balls count against the bowler.</li>
                                        <li>Three wides or three no-balls in 6 deliveries = automatic disqualification.</li>
                                        <li>Byes do not count for either party; leg byes go to the batsman&apos;s score.</li>
                                        <li>In case of a tie, both batsman and bowler qualify.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-900 mb-1">Wicketkeeping Rules</h4>
                                    <p className="text-slate-600">Wicketkeepers will be evaluated by a dedicated BRPL Selection Panel based on agility, technique, glovework, and game awareness.</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">5. Selection Criteria</h3>
                            <p className="text-slate-600 mb-2">Selections depend on:</p>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600 mb-3">
                                <li>Skill performance and statistical output</li>
                                <li>Consistency across qualification rounds</li>
                                <li>Attitude, discipline, fitness, and adherence to BRPL values</li>
                            </ul>
                            <p className="text-slate-600 mb-3">A player may register multiple times for a season, but may participate in only one trial per registration.</p>
                            <h4 className="font-bold text-slate-900 mb-1">Selectors Panel</h4>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                <li>1 Head Selector (appointed by BRPL)</li>
                                <li>1 Zonal/State Coordinator</li>
                                <li>1 Statistician/Scoring Official</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">6. Code of Conduct</h3>
                            <p className="text-slate-600 mb-2">All participants must:</p>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600 mb-3">
                                <li>Follow instructions issued by BRPL staff</li>
                                <li>Show respect toward peers, selectors, and officials</li>
                                <li>Avoid arguments, misconduct, or abusive language</li>
                            </ul>
                            <p className="text-slate-600 mb-2">Violations may lead to:</p>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                <li>Immediate disqualification</li>
                                <li>Suspension from future BRPL events</li>
                                <li>Blacklisting, depending on severity</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">7. Medical &amp; Safety Protocols</h3>
                            <ul className="list-disc pl-6 space-y-2 text-slate-600">
                                <li>Certified first-aid personnel must be present at every trial.</li>
                                <li>Hydration zones with drinking water &amp; electrolytes must be available.</li>
                                <li>Warm-up and stretching routines are encouraged before trials.</li>
                                <li>Ambulance support is recommended for large-scale trial venues.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">8. Post-Trial Process</h3>
                            <h4 className="font-bold text-slate-900 mb-1">Result Announcement</h4>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600 mb-3">
                                <li>Preliminary results will be announced within 7 days on BRPL&apos;s official platforms.</li>
                                <li>Selected players will receive SMS/email confirmation.</li>
                            </ul>
                            <h4 className="font-bold text-slate-900 mb-1">Next Steps</h4>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                <li>Shortlisted players will enter the BRPL Auction pool.</li>
                                <li>A background verification (age, ID, conduct) will follow.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">9. Records &amp; Reporting</h3>
                            <p className="text-slate-600 mb-2">Each trial session must be logged with:</p>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                <li>Attendance registers</li>
                                <li>Player performance scores</li>
                                <li>Selector remarks</li>
                                <li>Digital submission to BRPL Central Operations</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">10. Media &amp; Publicity</h3>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                <li>Media coverage requires approval from the BRPL Media Team.</li>
                                <li>Only approved photos/videos may be posted publicly.</li>
                                <li>Players must not give interviews or statements without BRPL permission.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Closing Note */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Closing Note</h2>
                    <div className="space-y-4 text-slate-600 leading-relaxed">
                        <p>The Beyond Reach Premier League (BRPL) is more than a cricket tournament — it is a movement to make India&apos;s dream of accessible, exciting cricket a reality. This Rulebook &amp; Match Operations Manual reflects our commitment to fairness, professionalism, and opportunity for every aspiring cricketer.</p>
                        <p>We believe excellence begins with structure and integrity. Whether you are stepping onto the field, representing a franchise, officiating a match, or supporting from the sidelines, this manual will guide your journey throughout BRPL.</p>
                        <p>Let us uphold the spirit of the game, inspire young dreamers, and build a league that celebrates India&apos;s love for cricket proudly and passionately.</p>
                        <p className="font-bold text-[#111a45] text-lg">Let&apos;s build &quot;Bharat Ki League, Bharat Ka Sapna!&quot;</p>
                        <p className="italic text-slate-500">— BRPL Organizing Committee</p>
                    </div>
                </section>

                {/* Appendices */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Appendices</h2>
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">Appendix A: Match Official Checklist</h3>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                <li>Venue inspection and readiness verification</li>
                                <li>Toss time compliance</li>
                                <li>Player eligibility confirmation</li>
                                <li>First-aid kit and safety check</li>
                                <li>Match equipment check (stumps, balls, jerseys, etc.)</li>
                                <li>Scorekeeping mechanism validation</li>
                                <li>Weather monitoring update (if applicable)</li>
                                <li>Post-match summary and report filing</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">Appendix B: Player Registration Form</h3>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                <li>Full name and recent photograph</li>
                                <li>Date of birth and age declaration</li>
                                <li>Team affiliation and jersey number</li>
                                <li>Emergency contact details</li>
                                <li>Aadhar or a valid ID proof copy</li>
                                <li>Declaration of fitness and no doping history</li>
                                <li>Signature of the player and team manager</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">Appendix C: Anti-Doping Declaration</h3>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                <li>Player&apos;s name and team</li>
                                <li>Acknowledgment of anti-doping policy</li>
                                <li>Consent for random testing during the tournament</li>
                                <li>Statement confirming non-use of prohibited substances</li>
                                <li>Signature of player</li>
                                <li>Date of submission</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">Appendix D: Incident Report Template</h3>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                <li>Match date and venue</li>
                                <li>Involved individuals and their team</li>
                                <li>Nature of incident (e.g., dissent, injury, misconduct)</li>
                                <li>Summary of the incident</li>
                                <li>Witnesses (if any)</li>
                                <li>Action taken by officials</li>
                                <li>Submitted by (name and designation)</li>
                                <li>Signature and timestamp</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">Appendix E: Code of Conduct Undertaking</h3>
                            <ul className="list-disc pl-6 space-y-1 text-slate-600">
                                <li>Player&apos;s full name and team name</li>
                                <li>Declaration of understanding and acceptance of BRPL&apos;s Code of Conduct</li>
                                <li>Agreement to uphold the league&apos;s values and fair play</li>
                                <li>Consent to disciplinary actions in case of breach</li>
                                <li>Signature of player and team manager</li>
                                <li>Date of submission</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Important Notice */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Important Notice</h2>
                    <p className="text-slate-600 leading-relaxed bg-amber-50 p-6 rounded-xl border border-amber-200">This document serves as the official charter of the Beyond Reach Premier League (BRPL) and stands as the primary reference for all matters related to league governance, match regulations, operational procedures, franchise responsibilities, and player trials. The BRPL Management reserves full authority to revise, amend, or expand any provision contained herein to ensure the smooth, fair, and efficient conduct of the BRPL season, zonal tournaments, and nationwide trials, especially in situations where venue limitations or ground-specific conditions require procedural adjustments.</p>
                </section>

                {/* Legal & Copyright */}
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">Legal &amp; Copyright Notice</h2>
                    <div className="space-y-4 text-slate-600 leading-relaxed bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <p>The contents of this Rulebook, including but not limited to match regulations, operational protocols, player selection frameworks, field measurements, trials guidelines, and all proprietary structures associated with the Beyond Reach Premier League (BRPL), are the exclusive intellectual property of the BRPL Management.</p>
                        <p>Any reproduction, distribution, modification, or usage, whether partial or complete, without prior written approval from BRPL is strictly prohibited. Unauthorized usage may result in legal action under applicable intellectual property, copyright, and commercial laws.</p>
                        <p>This document has been created solely for internal operations, franchise onboarding, official partnerships, and authorised media communication within the BRPL ecosystem. It embodies original strategic design, operational planning, and format innovation crafted specifically for BRPL&apos;s T10 cricket framework.</p>
                        <p>Professional courtesy, confidentiality, and respect for proprietary content are expected from all stakeholders.</p>
                        <p className="font-bold text-slate-900 mt-4">&copy; Beyond Reach Premier League | All Rights Reserved — BRPL</p>
                    </div>
                </section>
            </div>
        </>
    );

    return (
        <SiteContextProvider value={ctx}>
            <div className="min-h-screen bg-gray-50/50 font-sans text-slate-800">
                <SEO title="Rule Book" description="Rule Book of Beyond Reach Premier League (BRPL)." />
                <PageBanner pageKey="ruleBook" title="Rule Book" currentPage="Rule Book" />

                <div className="max-w-8xl mx-auto px-4 md:px-8 py-12 lg:py-16">
                    <div className="p-8 md:p-12 rounded-3xl shadow-lg border border-gray-100 bg-white">
                        {renderStaticContent()}
                    </div>
                </div>
            </div>
        </SiteContextProvider>
    );
}

/**
 * DALE–CHALL FAMILIAR WORD LIST (ABRIDGED)
 * ========================================
 *
 * The New Dale–Chall formula scores text against a list of ~3,000 words that
 * 80% of American fourth-graders were found to know. Anything off the list counts
 * as "difficult".
 *
 * HONEST DISCLOSURE, and it belongs in the writeup too: this is an ABRIDGED list
 * of roughly 1,000 high-frequency English words, assembled for this project — not
 * the complete licensed Chall & Dale (1995) list. A shorter list marks more words
 * unfamiliar, so our Dale–Chall figures run slightly CONSERVATIVE (harder) than a
 * full implementation would report.
 *
 * This is why Dale–Chall is reported and not gated on. The gate is Flesch–Kincaid,
 * which needs no word list at all and is therefore exact.
 *
 * Inflections are handled by rule in readability.ts (isFamiliar), so only base
 * forms are listed here.
 */

const WORDS = `
a able about above accept accident account ache across act add address admire
afraid after afternoon again against age ago agree ah ahead air airplane airport
alarm alike alive all alley almost alone along aloud already also always am
america american among amount an and angel anger angry animal another answer ant
any anybody anyhow anyone anything anyway anywhere apart apartment ape apiece
appear apple april apron are area aren't arise arithmetic arm army arose around
arrange arrive arrow art artist as ash aside ask asleep at ate attack attempt
attend attention august aunt author auto automobile autumn avenue awake award
away awful baa baby back backward bacon bad badge bag bake balance ball balloon
band bang bank bar barber bare bark barn barrel base baseball basement basket bat
batch bath be beach bead beam bean bear beard beast beat beauty became because
become bed bee been beer beet before beg began begin begun behave behind being
believe bell belong below belt bench bend beneath bent berry beside best bet
better between beyond bib bicycle big bill billboard bin bind bird birth
birthday bit bite bitter black blackberry blackbird blackboard blade blame blank
blanket blast blaze bleed bless blew blind blindfold blink block blood bloom
blossom blot blow blue bluebird blush board boat bob body boil bold bone bonnet
book boot born borrow boss both bother bottle bottom bought bounce bow bowl box
boy brain brake branch brass brave bread break breakfast breast breath breathe
breeze brick bride bridge bright bring broad broke broken brook broom brother
brought brown brush bubble bucket buckle bud buffalo bug buggy build built bulb
bull bullet bum bump bun bunch bundle bunny burn burst bury bus bush business
busy but butcher butter butterfly button buy buzz by cab cabbage cabin cage cake
calendar calf call came camel camp can canal candle candy cane cannon cannot
canoe can't cap cape capital captain car card care careful careless carpenter
carpet carriage carrot carry cart carve case cash cat catch cattle caught cause
cave ceiling cell cellar cent center cereal certain chain chair chalk champion
chance change chap charge charm chart chase chat cheap cheat check cheek cheer
cheese cherry chest chew chick chicken chief child children chill chimney chin
china chip chocolate choice choose chop chorus chose chosen church churn cigarette
circle circus citizen city clang clap class classmate classroom claw clay clean
clear clerk clever click cliff climb clip cloak clock close closet cloth clothes
cloud clover clown club cluck clump coach coal coast coat cob cobbler cocoa
coconut cod coffee coffeepot coin cold collar college color colt column comb come
comfort comic company compare compass complete concert condition cone connect
contain content continue cook cool coop copper copy cord cork corn corner correct
cost cot cottage cotton couch cough could couldn't count counter country county
course court cousin cover cow coward cowboy cozy crab crack cracker cradle cramp
cranberry crank crash crawl crazy cream creamy creek creep crept cried cross
crossing crow crowd crown cruel crumb crumble crush crust cry cub cuff cup cure
curl curtain curve cushion custard customer cut cute cutting dad daddy daily
dairy daisy dam damage dame damp dance dandy danger dare dark darling darn dart
dash date daughter dawn day daybreak daytime dead deaf deal dear death december
decide deck deed deep deer defeat defend delight den dentist depend deposit
describe desert deserve desire desk destroy devil dew diamond did didn't die
difference different dig dim dime dine dinner dip direct direction dirt dirty
discover dish dislike distance distant ditch dive divide do dock doctor does dog
doll dollar dolly done donkey don't door doorbell dope dot double dough dove down
downstairs downtown dozen drag drain drank draw drawer dream dress dresser drew
dried drift drill drink drip drive driven driver drop drove drown drowsy drub drum
drunk dry duck due dug dull dumb dump during dust duty dwarf dwell dwelt dying
each eager eagle ear early earn earth east easy eat eaten edge egg eh eight
eighteen eighth eighty either elbow elder eldest electric electricity elephant
eleven elf elm else elsewhere empty end enemy engine engineer enjoy enough enter
envelope equal erase eraser errand escape eve even evening ever every everybody
everyday everyone everything everywhere evil exact except exchange excited
exciting excuse exit expect explain extra eye eyebrow face facing fact factory
fail faint fair fairy faith fake fall false family fan fancy far faraway fare
farm farmer farther fashion fast fasten fat father fault favor favorite fear
feast feather february fed feed feel feet fell fellow felt fence fever few fib
fiddle field fife fifteen fifth fifty fig fight figure file fill film finally
find fine finger finish fire firearm fireplace firework firm first fish fisherman
fist fit five fix flag flake flame flap flash flashlight flat flea flesh flew
flies flight flip float flock flood floor flop flour flow flower flutter fly foam
fog foggy fold folk follow food fool foot football footprint for forehead forest
forget forgive forgot fork form fort forth fortune forty forward fought found
fountain four fourteen fourth fox frame free freedom freeze freight french fresh
fret friday fried friend friendly friendship frighten frog from front frost frown
froze fruit fry fudge fuel full fully fun funny fur furniture further fuzzy game
gang garage garbage garden gas gasoline gate gather gave gay gear geese general
gentle gentleman geography get getting giant gift gingerbread girl give given
glad glance glass gleam glide glory glove glow glue go goes going gold golden
goldfish golf gone good goodbye goodness goods goody goose gooseberry got govern
government gown grab gracious grade grain grand grandchild grandfather grandma
grandmother grandpa grandson grandstand grape grapefruit grapes grass grasshopper
grateful grave gravel graveyard gravy gray graze grease great green greet grew
grind groan grocery ground group grove grow guard guess guest guide gulf gum gun
gunpowder guy ha habit had hadn't hail hair haircut hairpin half hall halt ham
hammer hand handful handkerchief handle handwriting hang happen happily happiness
happy harbor hard hardly hardship hardware hare hark harm harness harp harvest
has hasn't haste hasten hasty hat hatch hatchet hate haul have haven't having
hawk hay hayfield haystack he head headache heal health healthy heap hear heard
hearing heart heat heater heaven heavy heel height held hell hello helmet help
helper helpful hem hen henhouse her herd here here's hero hers herself hey hickory
hid hidden hide high highway hill hillside hilltop hilly him himself hind hint hip
hire his hiss history hit hitch hive ho hoe hog hold holder hole holiday hollow
holy home homely homesick honest honey honeybee honeymoon honk honor hood hoof
hook hoop hop hope hopeful hopeless horn horse horseback horseshoe hose hospital
host hot hotel hound hour house housetop housewife housework how however howl hug
huge hum humble hump hundred hung hunger hungry hunk hunt hunter hurrah hurried
hurry hurt husband hush hut hymn i ice icy idea ideal if ill important impossible
improve in inch income indeed indian indoors ink inn insect inside instant
instead insult intend interested interesting into invite iron is island isn't it
its itself ivory ivy jacket jacks jail jam january jar jaw jay jelly jellyfish
jerk jig job jockey join joke joking jolly journey joy joyful joyous judge jug
juice juicy july jump june junior junk just keen keep kept kettle key kick kid
kill killed kind kindly kindness king kingdom kiss kitchen kite kitten kitty knee
kneel knew knife knit knives knob knock knot know known lace lad ladder ladies
lady laid lake lamb lame lamp land lane language lantern lap lard large lash lass
last latch late laugh laundry law lawn lawyer lay lazy lead leader leaf lean leap
learn learned least leather leave leaving led left leg lemon lemonade lend length
less lesson let let's letter letting lettuce level liberty library lice lick lid
lie life lift light lightning like likely liking lily limb lime limp line linen
lion lip list listen lit little live lively liver lives living lizard load loaf
loan loaves lock locomotive log lone lonely lonesome long look lookout loop loose
lord lose loser loss lost lot loud love lovely lover low luck lucky lumber lump
lunch lying ma machine machinery mad made magazine magic maid mail mailbox mailman
major make making male mama mamma man manager mane manger many map maple marble
march mare mark market marriage married marry mask mast master mat match matter
mattress may maybe mayor maypole me meadow meal mean means meant measure meat
medicine meet meeting melt member men mend meow merry mess message met metal mew
mice middle midnight might mighty mile milk milkman mill million mind mine miner
mint minute mirror mischief miss misspell mistake misty mitt mitten mix moment
monday money monkey month moo moon moonlight moose mop more morning morrow moss
most mostly mother motor mount mountain mouse mouth move movie movies moving mow
mud muddy mug mule multiply murder music must my myself nail name nap napkin
narrow nasty naughty navy near nearby nearly neat neck necktie need needle needn't
neighbor neighborhood neither nerve nest net never nevermore new news newspaper
next nibble nice nickel night nightgown nine nineteen ninety no nobody nod noise
noisy none noon nor north northern nose not note nothing notice november now
nowhere number nurse nut oak oar oatmeal oats obey ocean october odd of off offer
office officer often oh oil old olive on once one onion only onward open or orange
orchard order ore organ other ought our ours ourselves out outdoors outfit outlaw
outline outside outward oven over overalls overcoat overeat overhead overhear
overnight overturn owe owing owl own owner ox pa pace pack package pad page paid
pail pain painful paint painter painting pair pal palace pale pan pancake pane
pansy pants papa paper parade pardon parent park part partly partner party pass
passenger past paste pasture pat patch path patter pave pavement paw pay payment
pea peace peaceful peach peak peanut pear pearl peas peck peek peel peep peg pen
pencil penny people pepper peppermint perfume perhaps person pet phone piano pick
pickle picnic picture pie piece pig pigeon pile pill pillow pin pine pineapple
pink pint pipe pistol pit pitch pitcher pity place plain plan plane plant plate
play player playground playhouse playmate plaything pleasant please pleasure
plenty plow plug plum pocket poem point poison poke pole police policeman polish
polite pond ponies pony pool poor pop popcorn porch pork possible post postage
postman pot potato pound pour powder power powerful praise pray prayer prepare
present pretty price prick prince princess print prison prize promise proper
protect proud prove prune public puddle puff pull pump pumpkin punch punish pup
pupil puppy pure purple purse push puss pussy put putting puzzle quack quart
quarter queen queer question quick quickly quiet quilt quit quite rabbit race rack
radio radish rag rail railroad railway rain rainbow rainy raise raisin rake ram
ran ranch rang rap rapidly rat rate rather rattle raw ray reach read reader
reading ready real really reap rear reason rebuild receive recess record red
redbird refuse reindeer rejoice remain remember remind remove rent repair repay
repeat report rest return review reward rib ribbon rice rich rid riddle ride
rider riding right rim ring rip ripe rise risen rising river road roadside roar
roast rob robber robe robin rock rocket rocky rode roll roller roof room rooster
root rope rose rosebud rot rotten rough round route row rowboat royal rub rubbed
rubber rubbish rug rule ruler rumble run rung runner running rush rust rusty rye
sack sad saddle sadness safe safety said sail sailboat sailor saint salad sale
salt same sand sandwich sandy sang sank sap sash sat satin satisfactory saturday
sausage savage save savings saw say scab scales scare scarf school schoolboy
schoolhouse schoolmaster schoolroom scorch score scrap scrape scratch scream
screen screw scrub sea seal seam search season seat second secret see seed seeing
seem seen seesaw select self selfish sell send sense sent sentence separate
september servant serve service set setting settle settlement seven seventeen
seventh seventy several sew shade shadow shady shake shaker shaking shall shame
shan't shape share sharp shave she she'd she'll she's shear shed sheep sheet
shelf shell shepherd shine shining shiny ship shirt shock shoe shoemaker shone
shook shoot shop shopping shore short shot should shoulder shouldn't shout shovel
show shower shut shy sick sickness side sidewalk sideways sigh sight sign silence
silent silk sill silly silver simple sin since sing singer single sink sip sir
sis sissy sister sit sitting six sixteen sixth sixty size skate skater ski skin
skip skirt sky slam slap slate slave sled sleep sleepy sleeve sleigh slept slice
slid slide sling slip slipped slipper slippery slit slow slowly sly smack small
smart smell smile smoke smooth snail snake snap snapping sneeze snow snowball
snowflake snowy snuff snug so soak soap sob socks sod soda sofa soft soil sold
soldier sole some somebody somehow someone something sometime sometimes somewhere
son song soon sore sorrow sorry sort soul sound soup sour south southern space
spade spank sparrow speak speaker spear speech speed spell spelling spend spent
spider spike spill spin spinach spirit spit splash spoil spoke spook spoon sport
spot spread spring springtime sprinkle square squash squeak squeeze squirrel
stable stack stage stair stall stamp stand star stare start starve state station
stay steak steal steam steamboat steamer steel steep steeple steer stem step
stepping stick sticky stiff still stillness sting stir stitch stock stocking
stole stone stood stool stoop stop stopped stopping store stork storm stormy story
stove straight strange stranger strap straw strawberry stream street stretch
string strip stripes strong stuck study stuff stump stung subject such suck sudden
suffer sugar suit sum summer sun sunday sunflower sung sunk sunlight sunny
sunrise sunset sunshine supper suppose sure surely surface surprise swallow swam
swamp swan swat swear sweat sweater sweep sweet sweetheart sweetness swell swept
swift swim swing switch sword swore table tablecloth tablet tack tag tail tailor
take taken taking tale talk talker tall tame tan tank tap tape tar task taste
taught tax tea teach teacher team tear tease teaspoon teeth telephone tell temper
ten tennis tent term terrible test than thank thanks that that's the theater thee
their them then there these they they'd they'll they're they've thick thief thimble
thin thing think third thirsty thirteen thirty this thorn those though thought
thousand thread three threw throat throne through throw thrown thumb thunder
thursday thy tick ticket tickle tie tiger tight till time tin tinkle tiny tip tire
tired title to toad toadstool toast tobacco today toe together toilet told
tomato tomorrow ton tone tongue tonight too took tool toot tooth toothbrush
toothpick top tore torn toss touch tow toward towel tower town toy trace track
trade train tramp trap tray treasure treat tree trick tricycle tried trim trip
trolley trouble truck true truly trunk trust truth try tub tuesday tug tulip
tumble tune tunnel turkey turn turtle twelve twenty twice twig twin two ugly
umbrella uncle under understand underwear undress unfair unfinished unfold unfriendly
unhappy unhurt uniform united unkind unknown unless unpleasant until unwilling up
upon upper upset upside upstairs uptown upward us use used useful valentine
valley valuable value vase vegetable velvet very vessel victory view village vine
violet visit visitor voice vote wag wagon waist wait wake waken walk wall walnut
want war warm warn was wash washer washtub wasn't waste watch watchman water
watermelon waterproof wave wax way wayside we weak weaken weakness wealth weapon
wear weary weather weave web we'd wedding wee weed week we'll weep weigh welcome
well went were west western wet we've whale what what's wheat wheel when whenever
where which while whip whipped whirl whisky whisper whistle white who who'd whole
whom who's whose why wicked wide wife wiggle wild wildcat will willing willow win
wind windmill window windy wine wing wink winner winter wipe wire wise wish wit
witch with without woke wolf woman women won wonder wonderful won't wood wooden
woodpecker woods wool woolen word wore work worker workman world worm worn worry
worse worst worth would wouldn't wound wove wrap wrapped wreck wren wring write
writing written wrong wrote wrung yard yarn year yell yellow yes yesterday yet
yolk yonder you you'd you'll young youngster your yours you're yourself yourselves
youth you've
`;

export const DALE_CHALL_FAMILIAR: ReadonlySet<string> = new Set(
  WORDS.split(/\s+/).map((w) => w.trim().toLowerCase()).filter(Boolean),
);

export const FAMILIAR_WORD_COUNT = DALE_CHALL_FAMILIAR.size;

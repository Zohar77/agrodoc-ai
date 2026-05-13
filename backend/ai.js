// ai.js — AgroDoc AI v4.0
// UPDATED: 30 diseases fully cached, detailed prescriptions, simplified language
const axios = require("axios");

const CACHE_VERSION = "2026.05.v4";

const LANG_PROMPTS = {
  en:  "Respond in clear simple English a farmer can understand.",
  pcm: "Respond in Nigerian Pidgin English. Use 'Oga','e dey','make you','quick quick' naturally like a friendly Nigerian neighbour.",
  ha:  "Respond in Hausa as spoken in northern Nigeria.",
  yo:  "Respond in Yoruba as spoken in southwestern Nigeria.",
  ig:  "Respond in Igbo as spoken in southeastern Nigeria.",
};

const CAT_INSTRUCTIONS = {
  crops:    "Diagnose a CROP or PLANT — disease, pest damage, or nutrient deficiency.",
  poultry:  "Diagnose POULTRY (chicken, turkey, duck, guinea fowl) — disease or health problem.",
  fish:     "Diagnose FISH or AQUACULTURE (catfish, tilapia, carp) — disease or water quality issue.",
  livestock:"Diagnose LIVESTOCK (cattle, goat, sheep, pig) — disease or health condition.",
};

// ── 30 FULLY DETAILED DISEASE CACHE ─────────────────────────────────────────
const OFFLINE_CACHE = {

  // ══ CROPS (14) ══════════════════════════════════════════════════════════════

  "cassava mosaic": {
    category:"crops", disease:"Cassava Mosaic Disease", subject:"Cassava",
    severity:"severe",
    description:"Your cassava leaves are showing yellow and green patchy patterns — this is Cassava Mosaic Disease, caused by a virus spread by tiny whitefly insects. It can destroy 20 to 95% of your harvest if not controlled quickly.",
    treatment:[
      "Walk through your farm today and pull out every plant with yellow mosaic patterns on the leaves. Remove the roots too and burn or bury them far from the farm",
      "Spray Confidor (Imidacloprid) on all remaining healthy plants to kill the whiteflies carrying the virus. Mix 10ml in 15 litres of water. Spray in the evening when it is cool",
      "After removing infected plants, replant using virus-resistant varieties: TME 419, NR 8082, or TMS 98/0505. Buy from a certified agro dealer",
      "Keep your farm weed-free. Weeds hide whiteflies. Clear all weeds within and around your farm every 2 weeks"
    ],
    pesticide:"Confidor (Imidacloprid) — 10ml in 15L water, spray every 2 weeks until whiteflies are gone",
    prevention:"Always use certified disease-free cuttings from a reputable agro dealer. Plant early in the season before whiteflies multiply. Inspect your farm weekly.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only. For severe outbreaks covering more than half your farm, contact your state ADP office for emergency support.",
    whatsappSummary:"Your cassava has Mosaic Disease from whitefly insects. Remove all infected plants immediately and spray Confidor to kill the whiteflies. Replant with resistant varieties."
  },

  "cassava bacterial": {
    category:"crops", disease:"Cassava Bacterial Blight", subject:"Cassava",
    severity:"moderate",
    description:"You are seeing water-soaked angular spots on the leaves and possibly dark cankers on the stems. This is Cassava Bacterial Blight — a bacterial disease that spreads through infected cutting tools and rain splash.",
    treatment:[
      "Stop working in the farm when it is wet or raining. The bacteria spread fastest on wet leaves",
      "Remove all stems showing dark lesions or wilting. Cut them off and burn them immediately",
      "Before cutting any more stems, dip your machete or knife in a mixture of 1 cup of bleach in 5 litres of water. Do this between every plant",
      "Spray all remaining plants with Copper Oxychloride fungicide — mix 30g in 15 litres of water. Spray the leaves and stems thoroughly"
    ],
    pesticide:"Copper Oxychloride — 30g in 15L water, spray every 10 days for 1 month",
    prevention:"Only use healthy certified cuttings. Disinfect all cutting tools before and after use. Rotate your cassava plot every 2 seasons.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only. Contact your state ADP office if symptoms continue spreading after treatment.",
    whatsappSummary:"Your cassava has Bacterial Blight. Stop working in wet conditions, remove and burn infected stems, and spray Copper Oxychloride on healthy plants."
  },

  "maize streak": {
    category:"crops", disease:"Maize Streak Virus", subject:"Maize",
    severity:"severe",
    description:"The yellow streaks running along your maize leaves are caused by Maize Streak Virus — a disease spread by tiny leafhoppers that feed on the leaves. This can destroy your entire harvest if not controlled.",
    treatment:[
      "Remove all maize plants that are already severely streaked — more than half the leaf area yellow. Pull them out with the roots and burn them",
      "Spray Karate (Lambda-cyhalothrin) on all remaining plants to kill the leafhoppers. Mix 10ml in 15 litres of water. Spray in the morning or evening, not in hot sun",
      "Replant empty spaces with streak-resistant varieties: SAMMAZ 15, SAMMAZ 27, or EVDT-Y varieties available from IITA-certified dealers",
      "Plant your next maize crop early — before June — to avoid the peak leafhopper season in July and August"
    ],
    pesticide:"Karate (Lambda-cyhalothrin) — 10ml in 15L water, spray every 7 days for 3 weeks",
    prevention:"Plant early. Use resistant varieties every season. Keep farm edges clear of grass where leafhoppers breed.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only. Contact your state ADP for seed supply of resistant varieties.",
    whatsappSummary:"Your maize has Streak Virus from leafhopper insects. Remove severely affected plants and spray Karate to kill the leafhoppers. Replant with SAMMAZ 15 or 27."
  },

  "maize stalk rot": {
    category:"crops", disease:"Maize Stalk Rot (Fusarium)", subject:"Maize",
    severity:"moderate",
    description:"Your maize stalks are becoming soft and rotting from the base — this is Fusarium Stalk Rot, a fungal disease that attacks maize weakened by poor nutrition or waterlogged soil.",
    treatment:[
      "Harvest immediately any plants where the stalk has become soft. Do not wait — they will fall and be lost completely",
      "Dig drainage channels between your rows to carry away excess water. Stalk rot spreads fastest in waterlogged soil",
      "For the remaining healthy plants, apply potassium fertilizer (MOP or SOP) — 1 handful per plant, placed in a ring around the base and watered in",
      "Do not plant maize in the same spot next season. Rotate with cowpea, groundnut, or cassava for at least one season"
    ],
    pesticide:"No effective chemical cure — prevention through potassium fertilizer and drainage is the best approach",
    prevention:"Apply balanced NPK fertilizer with adequate potassium. Plant on raised beds or ridges. Avoid planting too densely.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only.",
    whatsappSummary:"Your maize has Stalk Rot caused by a fungus in wet soil. Harvest affected plants now before they fall. Improve drainage and add potassium fertilizer to healthy plants."
  },

  "tomato blight": {
    category:"crops", disease:"Early Blight (Alternaria)", subject:"Tomato",
    severity:"moderate",
    description:"The brown spots with target-board rings on your lower tomato leaves are Early Blight — a fungal disease that spreads upward from the bottom of the plant during warm, wet weather.",
    treatment:[
      "Pick off and destroy all infected leaves starting from the bottom. Put them in a bag and burn or bury them — do not leave them on the ground",
      "Spray Ridomil Gold MZ or Mancozeb on all remaining plants. Mix 25g in 15 litres of water. Spray the undersides of leaves where the fungus hides",
      "Stake your tomato plants if not already done — good airflow between plants slows the spread of blight",
      "Water only at the base of the plant using a watering can. Avoid wetting the leaves — wet leaves spread blight 3 times faster"
    ],
    pesticide:"Ridomil Gold MZ — 25g in 15L water, spray every 7 days. Or Mancozeb (Dithane M-45) — 30g in 15L water",
    prevention:"Rotate tomato with other crops every season. Mulch the base of plants to prevent soil splash. Use drip irrigation if possible.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only. If more than half your plants are affected, contact your state ADP office.",
    whatsappSummary:"Your tomatoes have Early Blight fungus. Remove infected lower leaves, spray Ridomil Gold or Mancozeb every 7 days, and stop wetting the leaves when watering."
  },

  "tomato late blight": {
    category:"crops", disease:"Late Blight (Phytophthora)", subject:"Tomato",
    severity:"severe",
    description:"The dark water-soaked patches spreading rapidly on your tomato leaves and fruits are Late Blight — one of the most destructive tomato diseases. It can destroy an entire farm in 3 to 5 days in wet weather.",
    treatment:[
      "Act today — this disease is extremely fast. Spray Ridomil Gold MZ immediately on all plants, mixing 25g in 15 litres of water",
      "Remove and destroy all heavily infected plants — pull them out and burn them away from the farm. Every infected plant is spreading spores to your healthy ones",
      "Never walk through infected plants and then touch healthy ones — wash your hands and change clothes if possible",
      "Spray again every 5 days until new growth shows no more dark patches"
    ],
    pesticide:"Ridomil Gold MZ — 25g in 15L water, spray every 5 days urgently. Also: Acrobat MZ or Revus as alternatives",
    prevention:"Plant resistant tomato varieties like Tropimech or Padma. Avoid planting during peak rainy season. Ensure good spacing between plants.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only. Late Blight is an emergency — contact your state ADP immediately if spread is rapid.",
    whatsappSummary:"URGENT — your tomatoes have Late Blight. Spray Ridomil Gold immediately and remove all heavily infected plants today. This disease can destroy everything in 3-5 days."
  },

  "tomato leaf curl": {
    category:"crops", disease:"Tomato Yellow Leaf Curl Virus", subject:"Tomato",
    severity:"severe",
    description:"Your tomato leaves are curling upward and turning yellow — this is Tomato Yellow Leaf Curl Virus, spread by whitefly insects. There is no cure once a plant is infected, but you can protect healthy plants.",
    treatment:[
      "Remove and destroy all plants with curled, yellowing leaves immediately. Pull them out completely — roots and all",
      "Spray Confidor (Imidacloprid) on all remaining healthy plants to kill the whiteflies. Mix 10ml in 15 litres of water",
      "Set up yellow sticky traps around your farm — whiteflies are attracted to yellow colour. These catch thousands before they reach your plants",
      "Replant with virus-resistant varieties such as Tropimech, Padma, or Cobra — available from certified agro dealers"
    ],
    pesticide:"Confidor (Imidacloprid) — 10ml in 15L water, spray every 7 days. Neem oil spray (50ml in 15L) can also help repel whiteflies",
    prevention:"Always plant resistant varieties. Remove infected plants immediately. Control weeds around the farm that harbour whiteflies.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only. No chemical can cure infected plants — focus on protecting healthy ones.",
    whatsappSummary:"Your tomatoes have Leaf Curl Virus from whiteflies. Remove all infected plants now, spray Confidor on healthy plants, and replant with resistant varieties like Tropimech."
  },

  "rice blast": {
    category:"crops", disease:"Rice Blast (Magnaporthe)", subject:"Rice",
    severity:"severe",
    description:"The diamond-shaped grey lesions with brown borders on your rice leaves and neck are Rice Blast — a fungal disease that can destroy your entire panicle if it reaches the neck before harvest.",
    treatment:[
      "Apply Beam (Tricyclazole) immediately — mix 15g in 15 litres of water and spray all plants thoroughly, especially the leaf-neck junction",
      "Drain your field partially for 2 to 3 days after spraying. Blast spreads faster in flooded fields",
      "Reduce your nitrogen fertilizer application immediately — too much nitrogen makes rice more susceptible to blast",
      "Spray again after 7 days if new lesions appear"
    ],
    pesticide:"Beam (Tricyclazole) — 15g in 15L water, spray immediately then again after 7 days. Tilt (Propiconazole) is an alternative",
    prevention:"Plant blast-resistant varieties: FARO 44, FARO 52, or NERICA varieties. Apply balanced NPK — avoid excess nitrogen. Ensure good water management.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only. Contact your state ADP rice extension team if panicle blast is severe.",
    whatsappSummary:"Your rice has Blast disease. Apply Beam (Tricyclazole) spray immediately, drain the field for 2-3 days, and reduce nitrogen fertilizer. Act fast before it reaches the panicle."
  },

  "pepper wilt": {
    category:"crops", disease:"Pepper Wilt / Phytophthora Root Rot", subject:"Pepper",
    severity:"moderate",
    description:"Your pepper plants are wilting suddenly with dark rot at the base of the stem — this is Phytophthora Root Rot, a water mould that attacks roots in waterlogged or poorly drained soil.",
    treatment:[
      "Dig drainage channels between rows immediately to remove standing water — this disease cannot spread without wet soil",
      "Mix Ridomil Gold MZ (25g) in 15 litres of water and drench the soil around affected plants — pour it slowly at the base so it soaks into the root zone",
      "Remove and burn all plants that are already completely wilted — they cannot be saved and will spread the disease",
      "Do not replant pepper in the same spot this season — the soil remains infected for months"
    ],
    pesticide:"Ridomil Gold MZ (Metalaxyl + Mancozeb) — 25g in 15L water as soil drench around plant base. Repeat every 14 days",
    prevention:"Plant on raised beds or ridges so water drains away from roots. Never plant in low-lying areas that flood. Rotate crops every season.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only.",
    whatsappSummary:"Your pepper has Phytophthora Root Rot from waterlogged soil. Improve drainage immediately and drench the soil with Ridomil Gold. Remove and burn completely dead plants."
  },

  "yam anthracnose": {
    category:"crops", disease:"Yam Anthracnose", subject:"Yam",
    severity:"moderate",
    description:"The dark spots and lesions appearing on your yam leaves, stems, and eventually the tubers are Anthracnose — a fungal disease that spreads in warm, humid conditions and reduces both yield and quality.",
    treatment:[
      "Remove and destroy all heavily infected leaves and stems — cut them off cleanly and burn them",
      "Spray Dithane M-45 (Mancozeb) — mix 30g in 15 litres of water and spray all plants every 14 days",
      "Stake your yam vines to get them off the ground — anthracnose spreads fastest when leaves touch damp soil",
      "Widen spacing between plants to allow air circulation — at least 1 metre between plants"
    ],
    pesticide:"Dithane M-45 (Mancozeb) — 30g in 15L water, spray every 14 days. Copper Oxychloride is an alternative at 30g in 15L",
    prevention:"Plant healthy setts from disease-free farms. Space plants 1m apart. Stake vines early. Remove crop debris after harvest.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only.",
    whatsappSummary:"Your yam has Anthracnose fungus. Remove infected leaves, spray Dithane M-45 every 2 weeks, and stake your vines to keep them off the ground."
  },

  "groundnut rosette": {
    category:"crops", disease:"Groundnut Rosette Virus", subject:"Groundnut",
    severity:"severe",
    description:"Your groundnut plants are stunted with small, yellow, mottled leaves and no pods forming — this is Groundnut Rosette Virus, spread by aphids. It can destroy your entire harvest.",
    treatment:[
      "Remove all infected plants immediately — pull them out completely and burn or bury them far from the farm",
      "Spray Actara (Thiamethoxam) or Dimethoate on all remaining healthy plants to kill aphids — mix 5g of Actara in 15 litres of water",
      "Plant SAMNUT 22, SAMNUT 24, or RMP 91 resistant varieties which are available from state ADP offices",
      "Plant your next crop early — rosette is worst when planting is late. Always plant before June"
    ],
    pesticide:"Actara (Thiamethoxam) — 5g in 15L water, spray every 7 days for 3 weeks. Dimethoate (40ml in 15L) is a cheaper alternative",
    prevention:"Plant early — before peak aphid season. Use resistant varieties every season. Keep farm weed-free to reduce aphid hiding places.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only. Contact your state ADP for supply of resistant varieties.",
    whatsappSummary:"Your groundnuts have Rosette Virus from aphid insects. Remove all infected plants immediately, spray Actara on healthy plants, and always plant early next season with resistant varieties."
  },

  "plantain sigatoka": {
    category:"crops", disease:"Black Sigatoka (Plantain)", subject:"Plantain/Banana",
    severity:"severe",
    description:"The dark brown to black streaks spreading across your plantain leaves are Black Sigatoka — a fungal disease that causes leaves to die early, preventing your bunch from filling properly and reducing yield by up to 50%.",
    treatment:[
      "Remove all heavily infected leaves — cut them off at the base with a clean cutlass and remove them from the farm completely. Do not leave them on the ground",
      "Spray Dithane M-45 (Mancozeb) — mix 30g in 15 litres of water. Spray the underside of leaves where the fungus grows. Spray every 3 weeks",
      "Cut back any surrounding vegetation that blocks airflow and keeps your plantain leaves damp",
      "Bag your bunches with blue plastic bags as soon as they emerge — this protects them from infection and improves size"
    ],
    pesticide:"Dithane M-45 (Mancozeb) — 30g in 15L water every 3 weeks. Tilt (Propiconazole) at 10ml in 15L is more effective for severe cases",
    prevention:"Plant resistant varieties. Remove dead leaves regularly. Space plants wide for good air circulation. Avoid planting in low-lying damp areas.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only. Contact NIHORT or your state ADP for resistant planting material.",
    whatsappSummary:"Your plantain has Black Sigatoka fungus. Remove all dark infected leaves and spray Dithane M-45 or Tilt every 3 weeks. Bag your bunches to protect them."
  },

  "cowpea mosaic": {
    category:"crops", disease:"Cowpea Mosaic Virus", subject:"Cowpea/Beans",
    severity:"moderate",
    description:"The yellow-green patchy mosaic patterns on your cowpea leaves and the stunted growth are caused by Cowpea Mosaic Virus — spread by aphids and bean beetles.",
    treatment:[
      "Remove all heavily infected plants and burn them — they cannot recover and will spread the virus",
      "Spray Cypermethrin or Dimethoate on remaining healthy plants to kill aphids and beetles — mix 20ml Cypermethrin in 15 litres of water",
      "Replant with IT90K-277-2 or IT97K-499-35 resistant varieties — available from IITA-certified dealers and state ADP offices",
      "Clear all weeds around and within the farm — weeds harbour the insects that carry this virus"
    ],
    pesticide:"Cypermethrin — 20ml in 15L water, spray every 7 days. Dimethoate 40ml in 15L is an alternative",
    prevention:"Use certified resistant seeds every planting season. Control aphids and beetles early. Keep farm weed-free at all times.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only.",
    whatsappSummary:"Your cowpea has Mosaic Virus from insects. Remove infected plants, spray Cypermethrin on healthy ones, and replant with resistant varieties like IT90K-277-2."
  },

  "cocoa pod rot": {
    category:"crops", disease:"Cocoa Black Pod Disease", subject:"Cocoa",
    severity:"severe",
    description:"The black rotting patches spreading across your cocoa pods are Black Pod Disease — caused by Phytophthora fungus. It spreads extremely fast in wet conditions and can destroy 30 to 90% of your pod harvest.",
    treatment:[
      "Remove and destroy all infected pods immediately — cut them off and bury them deep or burn them. Every infected pod left on the tree releases millions of spores",
      "Spray Copper Oxychloride on all remaining healthy pods and the surrounding bark — mix 30g in 15 litres of water. Spray thoroughly covering all pod surfaces",
      "Prune your cocoa canopy to let in more light and reduce humidity — black pod cannot survive in dry, well-lit conditions",
      "Harvest all ripe pods immediately — do not leave ripe pods on the tree as they attract the fungus"
    ],
    pesticide:"Copper Oxychloride — 30g in 15L water, spray every 2-3 weeks during rainy season. Ridomil Gold MZ at 25g in 15L is more effective for severe outbreaks",
    prevention:"Regular pruning to reduce canopy humidity. Remove and destroy all mummified pods. Harvest promptly. Apply copper fungicide preventively before rainy season.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only. Contact CRIN (Cocoa Research Institute of Nigeria) at Ibadan for technical support on severe outbreaks.",
    whatsappSummary:"Your cocoa has Black Pod Disease. Remove ALL infected pods immediately and spray Copper Oxychloride on remaining pods. Prune the canopy to reduce humidity. Act fast."
  },

  // ══ POULTRY (6) ═════════════════════════════════════════════════════════════

  "newcastle": {
    category:"poultry", disease:"Newcastle Disease (NCD)", subject:"Chicken/Poultry",
    severity:"severe",
    description:"The gasping, twisted necks, green watery droppings and sudden deaths in your flock are classic signs of Newcastle Disease — one of the most deadly poultry diseases in Nigeria. It can wipe out an entire flock within 3 to 5 days.",
    treatment:[
      "IMMEDIATELY separate all sick birds from healthy ones in a completely different location. Newcastle spreads through air and droppings within hours",
      "Vaccinate ALL healthy birds with Lasota ND Vaccine RIGHT NOW — this is the most important action. Your agro dealer has it. One dose protects for 3 months",
      "Bury or burn all dead birds immediately — never eat them or throw them in the open. The virus survives in carcasses for days",
      "Disinfect the entire poultry house with Izal or formalin solution (30ml in 1 litre of water). Spray walls, floor, drinkers and feeders",
      "Give surviving birds Oxytetracycline in their water for 5 days to prevent secondary infections — 1 teaspoon per 4 litres of water"
    ],
    pesticide:"Lasota ND Vaccine — administer eye or nose drop immediately. Oxytetracycline — 1 teaspoon per 4 litres drinking water for 5 days",
    prevention:"Vaccinate ALL chicks at Day 1 (Hitchner B1), Day 14 (Lasota), and every 3 months after. Never bring unvaccinated birds into your farm. Disinfect before restocking.",
    confidence:"high",
    disclaimer:"⚠️ AgroDoc AI is advisory only. Contact a vet immediately if flock losses exceed 5% in one day. Newcastle Disease is notifiable — report to your state veterinary office.",
    whatsappSummary:"URGENT — your chickens have Newcastle Disease. Separate sick birds immediately, vaccinate healthy ones with Lasota NOW, and disinfect the entire pen. Call a vet today."
  },

  "gumboro": {
    category:"poultry", disease:"Gumboro Disease (IBD)", subject:"Chicken/Poultry",
    severity:"severe",
    description:"The ruffled feathers, white watery droppings, and hunched posture in your 3 to 6 week old chicks are signs of Gumboro Disease — a viral infection that destroys the immune system, making birds unable to fight any other disease.",
    treatment:[
      "Separate affected birds from healthy ones immediately — Gumboro spreads through droppings and contaminated water",
      "Add electrolytes and vitamins to the drinking water of all birds — mix 1 sachet of Electrolyte Plus per 4 litres of water to support weak birds",
      "Vaccinate all healthy chicks in the flock with IBD (Gumboro) vaccine immediately if they have not already been vaccinated",
      "Increase warmth in the poultry house — sick birds lose body heat quickly. Add bulbs or move birds closer together",
      "Give Oxytetracycline in water for 5 days to prevent secondary bacterial infections — 1 teaspoon per 4 litres"
    ],
    pesticide:"IBD Gumboro Vaccine for prevention. Oxytetracycline — 1 teaspoon per 4L drinking water for 5 days. Electrolyte Plus — 1 sachet per 4L water",
    prevention:"Vaccinate at Day 14 and Day 28. Clean and disinfect poultry house completely between batches. Never reuse litter from infected flocks.",
    confidence:"high",
    disclaimer:"⚠️ AgroDoc AI is advisory only. Consult a certified poultry vet for the correct vaccine schedule for your flock size and age.",
    whatsappSummary:"Your young chicks have Gumboro Disease. Add electrolytes to their water immediately, vaccinate healthy birds with IBD vaccine, and increase warmth in the pen."
  },

  "coccidiosis": {
    category:"poultry", disease:"Coccidiosis", subject:"Chicken/Poultry",
    severity:"moderate",
    description:"The bloody or dark reddish-brown droppings, loss of appetite and drooping wings in your birds are signs of Coccidiosis — caused by Eimeria parasites that live in wet, dirty litter and damage the intestines.",
    treatment:[
      "Start treatment immediately — add Amprolium (Amprol) to drinking water: 1 teaspoon per 4 litres of water. Give for 5 to 7 days",
      "Remove all wet and dirty litter from the poultry house today and replace with fresh, dry litter. Wet litter is where Eimeria lives and multiplies",
      "Disinfect all drinkers and feeders daily with clean water and a small amount of bleach",
      "Add Vitamin A and Vitamin K to the feed or water — Coccidiosis damages the gut and these vitamins help repair it faster"
    ],
    pesticide:"Amprolium (Amprol) — 1 teaspoon per 4L drinking water for 5-7 days. Embazin Forte is an alternative. Follow with Vitamin A and K supplement for 5 days",
    prevention:"Keep litter dry at all times. Avoid overcrowding. Use coccidiostats (Amprolium or Salinomycin) in starter feed from Day 1 to Day 42.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only. Consult a vet for correct Amprolium dosage for your flock size — overdose can harm birds.",
    whatsappSummary:"Your birds have Coccidiosis from dirty wet litter. Add Amprolium to their drinking water immediately, replace all wet litter with dry material, and add vitamins to their feed."
  },

  "fowl pox": {
    category:"poultry", disease:"Fowl Pox", subject:"Chicken/Poultry",
    severity:"moderate",
    description:"The wart-like scabs and crusty lesions on your chicken's comb, wattles and face — and possibly white patches inside the mouth — are Fowl Pox, spread by mosquito bites and direct contact between birds.",
    treatment:[
      "Separate birds with severe lesions from the healthy flock to prevent direct contact spread",
      "Apply iodine solution (Betadine) gently to the skin lesions using cotton wool — this prevents secondary bacterial infection in the wounds",
      "Vaccinate all unaffected birds with Fowl Pox vaccine immediately using the wing-web method",
      "Eliminate mosquito breeding sites around your farm — drain standing water, clear bushes and cut grass around the pen",
      "Give tetracycline antibiotics in water for 5 days to prevent secondary infections — 1 teaspoon per 4 litres"
    ],
    pesticide:"Fowl Pox Vaccine (wing-web administration). Betadine (Iodine) for skin lesions. Oxytetracycline — 1 teaspoon per 4L water for 5 days",
    prevention:"Vaccinate all birds at 6 to 8 weeks of age. Screen poultry pens against mosquitoes using nets. Control mosquito breeding areas around the farm.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only. Consult your poultry vet for vaccination protocols suitable for your flock.",
    whatsappSummary:"Your chickens have Fowl Pox spread by mosquitoes. Apply Betadine to skin lesions, vaccinate unaffected birds immediately, and eliminate mosquito breeding areas around your farm."
  },

  "avian typhoid": {
    category:"poultry", disease:"Fowl Typhoid (Salmonella Gallinarum)", subject:"Chicken/Poultry",
    severity:"moderate",
    description:"The greenish-yellow watery droppings, pale comb and wattles, and sudden deaths in adult birds are signs of Fowl Typhoid — a bacterial infection caused by Salmonella that spreads through contaminated feed, water, and equipment.",
    treatment:[
      "Start antibiotic treatment immediately — add Enrofloxacin (Baytril 10%) to drinking water: 1ml per litre of water. Give for 5 days",
      "Separate sick birds from healthy ones straight away. Fowl Typhoid spreads through droppings very quickly",
      "Disinfect all drinkers, feeders, and the entire poultry house floor with Izal or formalin solution (30ml per litre of water)",
      "Remove and safely dispose of all dead birds — bury them at least 1 metre deep or burn them"
    ],
    pesticide:"Enrofloxacin 10% (Baytril) — 1ml per litre of drinking water for 5 days. Must be prescribed by a vet. Oxytetracycline is a cheaper alternative at 1 teaspoon per 4L",
    prevention:"Buy chicks from reputable hatcheries with Salmonella-free certification. Vaccinate with Fowl Typhoid + AE combo vaccine. Disinfect between batches.",
    confidence:"high",
    disclaimer:"⚠️ AgroDoc AI is advisory only. Antibiotic use in poultry must be under veterinary prescription to prevent drug resistance. Do not use antibiotics reserved for human medicine.",
    whatsappSummary:"Your adult chickens have Fowl Typhoid (Salmonella). Start Enrofloxacin treatment in their water immediately, isolate sick birds, and disinfect the entire pen."
  },

  "marek's disease": {
    category:"poultry", disease:"Marek's Disease", subject:"Chicken/Poultry",
    severity:"severe",
    description:"The leg and wing paralysis, grey discolouration of the eye, and wasting in your growing birds (6 to 20 weeks old) are signs of Marek's Disease — a herpesvirus with no cure. Prevention is everything.",
    treatment:[
      "There is no treatment for Marek's Disease. Birds that are already paralysed cannot be cured",
      "Cull (humanely kill) all severely paralysed birds to prevent suffering and reduce virus load in the pen",
      "Vaccinate all remaining birds in the flock immediately if they have not been vaccinated — though this works best before exposure",
      "Thoroughly disinfect the entire poultry house — Marek's virus can survive in feather dust and dander for months",
      "Do not bring unvaccinated birds into your farm under any circumstances"
    ],
    pesticide:"Marek's Disease Vaccine — must be given at day-old at the hatchery. No treatment chemicals exist for this disease",
    prevention:"Every chick MUST receive Marek's vaccine on Day 1 at the hatchery — this cannot be done on farm. Always buy from hatcheries that vaccinate. Practice strict all-in all-out management.",
    confidence:"high",
    disclaimer:"⚠️ AgroDoc AI is advisory only. Marek's vaccine MUST be administered at hatchery on day old — it cannot be done later. Always source chicks from vaccinating hatcheries.",
    whatsappSummary:"Your growing birds have Marek's Disease — there is no cure. Cull paralysed birds, disinfect thoroughly, and ensure all future chicks are vaccinated at the hatchery on day one."
  },

  // ══ FISH (5) ════════════════════════════════════════════════════════════════

  "columnaris": {
    category:"fish", disease:"Columnaris (Saddle Rot)", subject:"Catfish/Tilapia",
    severity:"severe",
    description:"The white or grey cotton-like patches on the skin, fins and gills of your fish — combined with fish gasping rapidly at the water surface — are signs of Columnaris disease. This bacterial infection can kill your entire pond within 24 to 48 hours if not treated immediately.",
    treatment:[
      "Change 30 to 50% of your pond water RIGHT NOW — this is the single most important action. Use clean, well-oxygenated water",
      "Add 3 to 5 grams of salt per litre of pond water — pour table salt or rock salt evenly across the pond surface. This reduces bacterial load and stress",
      "Treat with Terramycin (Oxytetracycline) mixed into fish feed: 50mg per kg of fish per day for 10 days. Mix with the feed and allow to dry before feeding",
      "Reduce stocking density immediately — overcrowding is the main cause. If possible, move some fish to another pond"
    ],
    pesticide:"Terramycin (Oxytetracycline) — 50mg per kg of fish body weight, mixed in feed for 10 days. Potassium Permanganate bath (10mg per litre for 20 minutes) can help for external lesions",
    prevention:"Maintain good water quality at all times. Test pH, ammonia and dissolved oxygen weekly. Never overstock your pond. Quarantine all new fish for 2 weeks.",
    confidence:"high",
    disclaimer:"⚠️ AgroDoc AI is advisory only. Columnaris kills in 24-48 hours — act immediately. Contact your state Fisheries Department if pond mortality is high.",
    whatsappSummary:"URGENT — your fish have Columnaris disease. Change 30-50% of the water immediately, add salt to the pond, and treat with Terramycin in their feed. This kills in 24-48 hours."
  },

  "gill disease": {
    category:"fish", disease:"Bacterial Gill Disease", subject:"Catfish/Tilapia",
    severity:"moderate",
    description:"Your fish gasping at the water surface with pale or darkened gills and reduced appetite are showing signs of Bacterial Gill Disease — caused by high ammonia levels from overfeeding, overcrowding, or poor water circulation.",
    treatment:[
      "Change 40% of the pond water immediately using clean fresh water — poor water quality is always the root cause",
      "Increase aeration urgently — add a paddle wheel aerator or pump air into the pond. Fish gasping at the surface means oxygen is dangerously low",
      "Prepare a Potassium Permanganate bath (10mg per litre of water) and dip affected fish for 20 minutes then return to the pond",
      "Remove all uneaten feed from the pond — rotting feed is the main source of ammonia that causes gill disease"
    ],
    pesticide:"Potassium Permanganate — 10mg per litre for 20-minute fish bath. Salt — 3g per litre added to pond as supportive treatment",
    prevention:"Test water weekly for ammonia, pH and dissolved oxygen. Feed only what fish can consume in 5 minutes. Service aerators regularly. Do regular partial water changes.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only. Contact your state Fisheries Department for water quality testing support.",
    whatsappSummary:"Your fish have Gill Disease from poor water quality. Change 40% of the water immediately, increase aeration, and remove all uneaten feed from the pond."
  },

  "ich": {
    category:"fish", disease:"White Spot Disease (Ich)", subject:"Fish",
    severity:"moderate",
    description:"The small white spots covering your fish that look like salt grains, combined with the fish rubbing against the pond walls, are signs of White Spot Disease (Ich) — caused by a parasite called Ichthyophthirius multifiliis.",
    treatment:[
      "Raise the water temperature to 28 to 30°C if you can — the Ich parasite cannot survive above 30°C. Use a water heater or increase sunlight exposure to the pond",
      "Add 3 grams of salt per litre of pond water (ordinary table salt or rock salt) and maintain for 7 to 10 days — this kills the free-swimming stage of the parasite",
      "Treat with Formalin if salt alone is not working — add 25ml of formalin per 1,000 litres of pond water. Aerate the water heavily during treatment. Leave for 1 hour then change 30% of the water",
      "Repeat treatment every 3 days for 2 weeks — the Ich life cycle is 2 weeks and you must catch all stages"
    ],
    pesticide:"Salt — 3g per litre maintained for 7-10 days. Formalin — 25ml per 1,000 litres for 1 hour treatment, with heavy aeration. Handle formalin with gloves — it is toxic",
    prevention:"Always quarantine new fish for 2 weeks before adding to main pond. Keep water temperature above 25°C. Avoid stress from overcrowding and poor water quality.",
    confidence:"high",
    disclaimer:"AgroDoc AI is advisory only. Handle Formalin with rubber gloves and in a ventilated area — it is a toxic chemical.",
    whatsappSummary:"Your fish have White Spot (Ich) parasite. Add salt (3g per litre) to the pond and raise water temperature to 28-30°C. Treat with Formalin if salt alone does not work within 3 days."
  },

  "catfish aeromoniasis": {
    category:"fish", disease:"Aeromonas Infection (Ulcer Disease)", subject:"Catfish",
    severity:"severe",
    description:"The red bleeding ulcers on the skin, haemorrhage at the base of fins, bloated belly, and rapid deaths in your catfish are signs of Aeromonas bacterial infection — one of the most common and deadly catfish diseases in Nigeria.",
    treatment:[
      "Change 50% of the pond water immediately — Aeromonas thrives in dirty water high in organic waste",
      "Treat the entire pond with Potassium Permanganate — dissolve 10mg in 1 litre of water and pour evenly across the pond. Leave for 30 minutes then add fresh water",
      "Mix Terramycin (Oxytetracycline) into fish feed: 50mg per kg of fish per day for 10 days. Weigh your fish to estimate total body weight for correct dosing",
      "Remove and safely dispose of all dead fish immediately — every dead fish releases millions more bacteria into the water"
    ],
    pesticide:"Terramycin (Oxytetracycline) — 50mg per kg fish weight in feed for 10 days. Potassium Permanganate — 10mg per litre pond water for 30-minute pond treatment",
    prevention:"Maintain clean water with regular partial changes. Never overfeed. Reduce stocking density. Avoid physical injuries to fish during handling.",
    confidence:"high",
    disclaimer:"⚠️ AgroDoc AI is advisory only. Aeromonas spreads fast — treat the entire pond not just visible sick fish. Contact state Fisheries Department for severe outbreaks.",
    whatsappSummary:"Your catfish have Aeromonas Ulcer Disease. Change 50% of the water immediately, treat the pond with Potassium Permanganate, and mix Terramycin into their feed for 10 days."
  },

  "tilapia lake virus": {
    category:"fish", disease:"Tilapia Lake Virus (TiLV)", subject:"Tilapia",
    severity:"severe",
    description:"The sunken eyes, skin ulcers, abnormal swimming behaviour, and mass deaths in your tilapia are signs of Tilapia Lake Virus — an emerging viral disease with no cure that can kill 80 to 90% of a tilapia population.",
    treatment:[
      "There is no antiviral treatment for TiLV — act immediately to contain the outbreak",
      "Remove and safely dispose of all dead and dying fish immediately — bury 1 metre deep or burn completely",
      "Disinfect all equipment that touched infected fish — nets, buckets, aerators — using Izal or chlorine solution (1 cup bleach in 10 litres water)",
      "Report to your state Fisheries Department immediately — TiLV is a notifiable disease in Nigeria and spread can affect neighbouring fish farms"
    ],
    pesticide:"No antiviral treatment available. Biosecurity and containment only. Disinfect with chlorine solution (1 cup bleach in 10L water) for all equipment",
    prevention:"Only buy tilapia fingerlings from certified, reputable hatcheries. Never mix fish from different sources. Quarantine all new stock for 2 weeks. Strict biosecurity for workers entering fish farm.",
    confidence:"medium",
    disclaimer:"⚠️ AgroDoc AI is advisory only. TiLV is a notifiable disease — report IMMEDIATELY to your state Fisheries Department. Do not move fish or sell from an infected pond.",
    whatsappSummary:"URGENT — your tilapia may have Tilapia Lake Virus. Remove all dead fish, disinfect all equipment, and report to your state Fisheries Department immediately. Do not sell or move fish."
  },

  // ══ LIVESTOCK (5) ═══════════════════════════════════════════════════════════

  "ppr": {
    category:"livestock", disease:"PPR (Peste des Petits Ruminants)", subject:"Goat/Sheep",
    severity:"severe",
    description:"The high fever, heavy eye and nose discharge, painful mouth sores, severe watery diarrhoea, and pneumonia in your goats or sheep are signs of PPR — a highly contagious viral disease that can kill 80 to 90% of an unvaccinated flock within days.",
    treatment:[
      "Isolate ALL sick animals immediately in a separate location — PPR spreads through direct contact, shared air, and contaminated water and feed",
      "Vaccinate ALL healthy animals in your flock with PPR vaccine RIGHT NOW — this is the only way to protect them",
      "Give sick animals Oxytetracycline LA injection (1ml per 10kg body weight) to treat secondary pneumonia and bacterial infections — this does not treat the virus but prevents deaths from secondary infections",
      "Provide clean water, electrolytes and good quality feed to help weak animals maintain strength",
      "Report to your state veterinary office immediately — PPR is a notifiable disease and they can provide emergency vaccine support"
    ],
    pesticide:"PPR Vaccine — administer to all healthy animals immediately. Oxytetracycline LA injection — 1ml per 10kg body weight for secondary infections. Electrolytes in drinking water",
    prevention:"Vaccinate all goats and sheep every 3 years. Never buy animals from unknown sources without vaccination history. Always quarantine new animals for 3 weeks before mixing with your flock.",
    confidence:"high",
    disclaimer:"⚠️ AgroDoc AI is advisory only. PPR IS A NOTIFIABLE DISEASE — contact your state veterinary office and NAFDAC immediately. It is illegal to move animals from an infected farm.",
    whatsappSummary:"URGENT — your goats/sheep have PPR disease. Isolate sick animals immediately, vaccinate healthy ones NOW, and report to your state vet office today. This can kill 90% of your flock."
  },

  "foot and mouth": {
    category:"livestock", disease:"Foot and Mouth Disease (FMD)", subject:"Cattle/Goat",
    severity:"severe",
    description:"The fever, painful blisters on the tongue and feet, excessive drooling, and severe lamping in your cattle or goats are signs of Foot and Mouth Disease — one of the most contagious animal diseases in the world, spreading through the air and contact.",
    treatment:[
      "Isolate ALL affected animals immediately in a completely separate area — FMD spreads through air up to 60km",
      "Wash mouth sores gently with sodium bicarbonate solution (2 tablespoons in 1 litre of water) twice daily to prevent secondary infection",
      "Spray or wash foot lesions with antiseptic — diluted Izal or potassium permanganate solution (10mg per litre)",
      "Give Oxytetracycline LA injection to prevent secondary bacterial pneumonia — 1ml per 10kg body weight",
      "Contact your state veterinary authority IMMEDIATELY — FMD is a notifiable disease and must be reported by law"
    ],
    pesticide:"FMD Vaccine for prevention — vaccinate twice yearly. Oxytetracycline LA injection for secondary infections. Sodium bicarbonate solution for mouth sores. Antiseptic spray for foot lesions",
    prevention:"Vaccinate all cattle twice yearly with FMD vaccine. Control animal movement in your area. Disinfect vehicles and equipment entering the farm. Never buy animals from unknown sources.",
    confidence:"high",
    disclaimer:"⚠️ AgroDoc AI is advisory only. FMD IS A NOTIFIABLE DISEASE — contact your state vet and NAFDAC today. Moving infected animals is a criminal offence in Nigeria.",
    whatsappSummary:"URGENT — your animals have Foot and Mouth Disease. Isolate them immediately, treat sores with sodium bicarbonate, and report to your state vet TODAY. Moving infected animals is illegal."
  },

  "african swine fever": {
    category:"livestock", disease:"African Swine Fever (ASF)", subject:"Pig",
    severity:"severe",
    description:"The very high fever, red or blue-purple skin discolouration, bloody diarrhoea, and sudden mass deaths in your pigs are signs of African Swine Fever — a 100% fatal viral disease with no cure or vaccine. It is the most feared pig disease in the world.",
    treatment:[
      "There is absolutely no treatment for ASF — all infected pigs must be culled immediately to prevent further spread",
      "Report to your state veterinary authority IMMEDIATELY before taking any further action",
      "Do not sell, move, or give away any pig from your farm — this is illegal during an ASF outbreak",
      "After culling, disinfect the entire pig house thoroughly with caustic soda solution (10% concentration) and leave empty for at least 6 months",
      "Bury all dead pigs at least 2 metres deep with lime, or burn them completely"
    ],
    pesticide:"No treatment exists — biosecurity and culling only. Disinfect with 10% caustic soda solution (100g caustic soda in 1 litre water). Handle with gloves — caustic soda burns skin",
    prevention:"Strict biosecurity — no visitors to pig pens. Never feed kitchen waste or garbage to pigs. No contact with wild boars. Buy pigs only from verified, disease-free farms.",
    confidence:"high",
    disclaimer:"⚠️ AgroDoc AI is advisory only. ASF IS FATAL AND NOTIFIABLE. Report to your state vet IMMEDIATELY. Moving infected pigs is a serious criminal offence in Nigeria.",
    whatsappSummary:"EMERGENCY — your pigs may have African Swine Fever. There is NO cure. Report to your state vet immediately, do NOT move any pigs, and prepare for culling. This is a notifiable disease."
  },

  "trypanosomiasis": {
    category:"livestock", disease:"Trypanosomiasis (Sleeping Sickness)", subject:"Cattle/Goat",
    severity:"severe",
    description:"The progressive weight loss, rough dry coat, watery eyes and nose discharge, weakness, and anaemia in your cattle or goats are signs of Trypanosomiasis — a blood parasite disease transmitted by tsetse flies in forest and bush areas.",
    treatment:[
      "Contact a certified vet to administer Berenil (Diminazene Aceturate) injection — this must NOT be given without vet supervision as the dosage is critical: 3.5mg per kg body weight",
      "Move your animals away from tsetse-infested bush areas and into more open, cleared land",
      "Set up tsetse fly traps around your grazing area — blue and black coloured traps are most effective",
      "Give iron supplements and vitamin B12 to anaemic animals to help rebuild their blood",
      "Repeat Berenil treatment after 3 weeks if symptoms return — always under vet supervision"
    ],
    pesticide:"Berenil (Diminazene Aceturate) — 3.5mg per kg body weight, IM injection by certified vet ONLY. Overdose is fatal to animals. Iron Dextran injection for severe anaemia",
    prevention:"Use trypanotolerant breeds in tsetse-affected areas (e.g. N'Dama cattle). Regular tsetse fly control using traps and insecticide-treated screens. Avoid grazing near tsetse-infested bush.",
    confidence:"high",
    disclaimer:"⚠️ AgroDoc AI is advisory only. Berenil MUST be administered by a certified veterinarian — incorrect dosage kills animals. Never self-administer without professional guidance.",
    whatsappSummary:"Your cattle/goats have Trypanosomiasis from tsetse flies. Call a certified vet immediately for Berenil injection — do not attempt this yourself. Move animals away from bush areas."
  },

  "lumpy skin": {
    category:"livestock", disease:"Lumpy Skin Disease (LSD)", subject:"Cattle",
    severity:"moderate",
    description:"The firm round nodules (lumps) appearing all over your cattle's skin, combined with fever, reduced milk production, and nasal discharge, are signs of Lumpy Skin Disease — a viral infection spread by biting insects like mosquitoes and flies.",
    treatment:[
      "Isolate affected cattle immediately from the rest of the herd — biting insects can carry the virus from sick to healthy animals",
      "Treat skin nodules with antiseptic ointment (Gentian Violet or wound spray) to prevent the nodules from becoming infected",
      "Give Oxytetracycline LA injection to all affected cattle to prevent secondary bacterial infections — 1ml per 10kg body weight",
      "Vaccinate all unaffected cattle in your herd immediately with LSD vaccine",
      "Report to your state veterinary office — LSD is a notifiable disease in Nigeria"
    ],
    pesticide:"LSD Vaccine for prevention — vaccinate annually. Oxytetracycline LA — 1ml per 10kg body weight for secondary infections. Gentian Violet or wound spray for skin lesions",
    prevention:"Vaccinate all cattle annually before the rainy season when biting insects peak. Control mosquitoes and flies around cattle pens. Avoid moving cattle during outbreaks in your area.",
    confidence:"high",
    disclaimer:"⚠️ AgroDoc AI is advisory only. LSD is notifiable in Nigeria — report to your state veterinary office. Contact your vet for correct vaccine administration.",
    whatsappSummary:"Your cattle have Lumpy Skin Disease from biting insects. Isolate sick animals, treat skin lumps with antiseptic, vaccinate healthy cattle now, and report to your state vet office."
  },

};

// ── CACHE LOOKUP FUNCTION ─────────────────────────────────────────────────────
function tryOfflineCache(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  // Try two-word match first (more specific)
  const key = Object.keys(OFFLINE_CACHE).find(k => {
    const parts = k.split(" ");
    return lower.includes(parts[0]) && (parts.length < 2 || lower.includes(parts[1]));
  });
  if (key) return OFFLINE_CACHE[key];
  // Fallback to single-word match
  const fallback = Object.keys(OFFLINE_CACHE).find(k => lower.includes(k.split(" ")[0]));
  return fallback ? OFFLINE_CACHE[fallback] : null;
}

// ── AI SYSTEM PROMPT ──────────────────────────────────────────────────────────
function buildSystemPrompt(lang="en", mode="farmer", category="crops") {
  return `You are AgroDoc AI, Nigeria's expert AI farm doctor. ${LANG_PROMPTS[lang]||LANG_PROMPTS.en}
${CAT_INSTRUCTIONS[category]||CAT_INSTRUCTIONS.crops}
${mode==="dealer" ? "The user is a professional agro-dealer or vet — give detailed technical information including scientific names, exact dosage rates, resistance management, and agronomic protocols." : "The user is a Nigerian smallholder farmer — use simple, practical everyday language. Name specific Nigerian market products they can buy locally. Explain WHY each step matters so they understand and follow through."}
${lang==="pcm" ? "Write like you are talking to a Nigerian farmer neighbour. Warm, direct, and helpful." : ""}

IMPORTANT RULES — NEVER SKIP:
1. Every response MUST include a clear disclaimer that AgroDoc AI is advisory only and the farmer should consult a certified agronomist or vet for serious problems
2. For notifiable diseases (Newcastle, FMD, PPR, ASF, CBPP, TiLV, Marek's) ALWAYS tell the farmer to contact their state veterinary office immediately
3. For all chemical/drug recommendations, always include the specific mixing rate and frequency
4. Write treatment steps as if explaining to someone who has never done this before — be specific and practical

Return ONLY raw JSON (no markdown, no backticks, no extra text):
{
  "category": "${category}",
  "subject": "specific crop or animal name in English",
  "disease": "disease or condition name",
  "severity": "mild|moderate|severe",
  "description": "2-3 sentences explaining what is wrong and why it matters to the farmer in plain language",
  "treatment": ["specific step 1 with exact quantities and method", "step 2", "step 3", "step 4"],
  "pesticide": "Nigerian product name, active ingredient, mixing rate and frequency (write N/A if not applicable)",
  "prevention": "2-3 practical prevention tips for next season",
  "confidence": "high|medium|low",
  "disclaimer": "AgroDoc AI is advisory only. [Add vet/ADP referral if severe or notifiable disease]",
  "whatsappSummary": "2-sentence summary a farmer can share with neighbours on WhatsApp"
}
If the crop or animal looks healthy: set disease to 'Healthy — No Disease Found' and give care tips. All text fields in the selected language EXCEPT subject (always English).`;
}

// ── MAIN DIAGNOSE FUNCTION ────────────────────────────────────────────────────
async function diagnose({ imageBase64, imageType="image/jpeg", text, lang="en", mode="farmer", category="crops" }) {
  const content = [];

  if (imageBase64) {
    // Ensure valid media type for Anthropic
    const validTypes = ["image/jpeg","image/png","image/gif","image/webp"];
    const safeType = validTypes.includes(imageType) ? imageType : "image/jpeg";
    content.push({
      type: "image",
      source: { type:"base64", media_type:safeType, data:imageBase64 }
    });
  }

  content.push({
    type: "text",
    text: text?.trim() || `Please analyse this ${category} and identify any disease, pest, or health problem.`
  });

  const response = await axios.post(
    "https://api.anthropic.com/v1/messages",
    {
      model:      "claude-opus-4-5",
      max_tokens: 1400,
      system:     buildSystemPrompt(lang, mode, category),
      messages:   [{ role:"user", content }],
    },
    {
      headers: {
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
      },
      timeout: 30000,
    }
  );

  const raw   = response.data.content?.map(b => b.text || "").join("").trim();
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

module.exports = { diagnose, tryOfflineCache, OFFLINE_CACHE, CACHE_VERSION };

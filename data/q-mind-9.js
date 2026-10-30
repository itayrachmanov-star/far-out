FarOut.addQuestions([
  { id: "q-mind-med-specialist", theme: "Medicine", ask: "Name a type of doctor or medical specialist", what: "a type of doctor or medical specialist", items: `
cardiologist:5; dermatologist:5; surgeon:5; pediatrician|paediatrician:5; psychiatrist:5; neurologist:4; oncologist:4; gynaecologist|gynecologist:4; orthopaedic surgeon|orthopedic surgeon|orthopaedist|orthopedist:4; radiologist:4;
anaesthetist|anesthetist|anaesthesiologist|anesthesiologist:4; ophthalmologist:4; obstetrician:4; pathologist:4; neurosurgeon:4; plastic surgeon:4; general practitioner|gp:4; urologist:3; endocrinologist:3; gastroenterologist:3;
nephrologist:3; pulmonologist:3; rheumatologist:3; haematologist|hematologist:3; geriatrician:3; podiatrist:3; dentist:3; orthodontist:3; optometrist:3; ent specialist|otolaryngologist|ent doctor|ear nose and throat doctor:3;
psychologist:3; cardiac surgeon|cardiothoracic surgeon|heart surgeon:3; physician:3; midwife:3; physiotherapist|physical therapist:3; chiropractor:3; allergist:3; immunologist:2; audiologist:2; vascular surgeon:2;
internist:2; family doctor|family physician:2; emergency physician|er doctor|emergency doctor:2; neonatologist:2; osteopath:2; epidemiologist:2; virologist:2; geneticist:2; forensic pathologist:2; dietitian|dietician|nutritionist:2;
occupational therapist:2; speech therapist|speech and language therapist:2; pharmacist:2; paramedic:2; oral surgeon|maxillofacial surgeon:2; trauma surgeon:2; psychotherapist|therapist:2; intensivist:1; perinatologist:1; toxicologist:1;
microbiologist:1; sports medicine physician|sports doctor:1; palliative care specialist|palliative care doctor:1; hepatologist:1; nuclear medicine specialist:1; interventional radiologist:1; cardiac electrophysiologist:1; dermatopathologist:1; neuropathologist:1; neuroradiologist:1;
orthoptist:1; prosthetist:1; nurse practitioner:1; phlebotomist:1; radiographer:1; sonographer:1; ophthalmic surgeon:1; periodontist:1; endodontist:1; pediatric surgeon|paediatric surgeon:1;
transplant surgeon:1; hand surgeon:1; bariatric surgeon:1; colorectal surgeon:1; breast surgeon:1; thoracic surgeon:1; spine surgeon:1; counsellor|counselor:1; rehabilitation specialist|physiatrist:1; pain specialist|pain management doctor:1;
sleep specialist|sleep doctor:1; travel medicine specialist:1; tropical medicine specialist:1; hematopathologist:1; cytologist:1; embryologist:1; clinical pharmacologist:1; infectious disease specialist:1; hospitalist:1; consultant:2;
nurse:3; chiropodist:1;
` },

  { id: "q-mind-medicine-name", theme: "Medicine", ask: "Name a medicine or drug (generic or brand name)", what: "a medicine or drug", items: `
ibuprofen|advil|nurofen|motrin:5; paracetamol|acetaminophen|tylenol|panadol:5; aspirin:5; penicillin:5; amoxicillin:4; morphine:4; insulin:4; salbutamol|albuterol|ventolin:4; codeine:3; cetirizine|zyrtec:3;
loratadine|claritin:3; diphenhydramine|benadryl:3; omeprazole|prilosec:3; metformin:3; atorvastatin|lipitor:3; lisinopril:3; warfarin:3; prednisone|prednisolone:3; hydrocortisone:3; diazepam|valium:3;
fluoxetine|prozac:3; sertraline|zoloft:3; ritalin|methylphenidate:3; oxycodone|oxycontin:3; fentanyl:3; naproxen|aleve:3; epinephrine|adrenaline|epipen:3; loperamide|imodium:3; melatonin:3; semaglutide|ozempic|wegovy:3;
nitrous oxide|laughing gas:3; ranitidine|zantac:2; simvastatin:2; amlodipine:2; heparin:2; alprazolam|xanax:2; citalopram|escitalopram|lexapro:2; amitriptyline:2; lithium:2; adderall:2;
levothyroxine|synthroid:2; tramadol:2; diclofenac|voltaren:2; naloxone|narcan:2; lidocaine:2; furosemide|lasix:2; ciprofloxacin|cipro:2; azithromycin|zithromax:2; doxycycline:2; acyclovir|aciclovir:2;
oseltamivir|tamiflu:2; hydroxychloroquine:2; chloroquine:2; quinine:2; ivermectin:2; gaviscon:2; tums|calcium carbonate:2; pepto-bismol|bismuth subsalicylate:2; zolpidem|ambien:2; gabapentin|neurontin:2;
botox|botulinum toxin:2; oestrogen|estrogen:2; progesterone:2; testosterone:2; folic acid:2; vitamin c:2; vitamin d:2; calamine:2; isotretinoin|accutane:2; methadone:2;
ketamine:2; propofol:2; ether:2; chloroform:2; novocaine|procaine:2; lorazepam|ativan:1; atropine:1; digoxin:1; propranolol:1; metoprolol:1;
tetracycline:1; erythromycin:1; ampicillin:1; cephalexin|keflex:1; metronidazole|flagyl:1; vancomycin:1; gentamicin:1; streptomycin:1; clindamycin:1; trimethoprim:1;
nitrofurantoin:1; fluconazole:1; remdesivir:1; paxlovid|nirmatrelvir:1; artemisinin:1; albendazole:1; mebendazole:1; senna:1; lactulose:1; bisacodyl:1;
ondansetron|zofran:1; metoclopramide:1; domperidone:1; rennie:1; pregabalin|lyrica:1; carbamazepine:1; phenytoin:1; valproate|valproic acid:1; levetiracetam:1; sumatriptan:1;
methotrexate:1; tamoxifen:1; cisplatin:1; doxorubicin:1; paclitaxel:1; imatinib:1; rituximab:1; adalimumab|humira:1; etanercept:1; pembrolizumab|keytruda:1;
liraglutide:1; orlistat:1; finasteride:1; tamsulosin:1; iron tablets:1; benzocaine:1; chlorhexidine:1; povidone-iodine|betadine:1; hydrogen peroxide:1; salicylic acid:1;
benzoyl peroxide:1; retinol:1; minoxidil:1; nicotine patch|nicotine gum:1; buprenorphine:1; naltrexone:1; midazolam:1; sevoflurane:1; digitalis:1; vitamin b12:1;
zinc:1; magnesium:1; probiotics:1; cod liver oil:1; echinacea:1; st john's wort:1; ginseng:1; chlorpheniramine|piriton:1; fexofenadine|allegra:1; montelukast|singulair:1;
budesonide|pulmicort:1; fluticasone|flixotide:1; beclometasone|clenil:1; ipratropium:1; theophylline:1; clopidogrel|plavix:1; rivaroxaban|xarelto:1; apixaban|eliquis:1; dabigatran:1; ramipril:1;
losartan:1; candesartan:1; bisoprolol:1; atenolol:1; bendroflumethiazide:1; spironolactone:1; hydrochlorothiazide:1; nifedipine:1; verapamil:1; diltiazem:1;
glyceryl trinitrate|gtn|nitroglycerin:1; isosorbide:1; ezetimibe:1; rosuvastatin|crestor:1; pravastatin:1; gliclazide:1; glipizide:1; sitagliptin|januvia:1; empagliflozin|jardiance:1; dapagliflozin|farxiga:1;
pioglitazone:1; insulin glargine|lantus:1; insulin lispro|humalog:1; allopurinol:1; colchicine:1; alendronic acid|alendronate|fosamax:1; calcitriol:1; denosumab:1; tacrolimus:1; ciclosporin|cyclosporine:1;
azathioprine:1; mycophenolate:1; hydroxyurea:1; thalidomide:1;
` },

  { id: "q-mind-first-aid-item", theme: "Medicine", ask: "Name something you'd find in a first aid kit", what: "something in a first aid kit", items: `
plasters|plaster|band-aids|band-aid|adhesive bandages|sticking plasters:5; bandage|bandages:5; gauze|gauze pads|sterile gauze:4; scissors:4; tweezers:4; antiseptic wipes|antiseptic wipe|antiseptic:4; thermometer:4; painkillers|pain killers|painkiller:4; disposable gloves|gloves|latex gloves|nitrile gloves:4; antiseptic cream|antibiotic ointment|savlon:3;
paracetamol:3; ibuprofen:3; aspirin:3; safety pins|safety pin:3; medical tape|surgical tape|micropore|adhesive tape:3; eye wash|eyewash:3; burn gel|burn cream|burns dressing:3; cotton wool|cotton balls:3; triangular bandage|sling:3; cpr mask|face shield|resuscitation mask|pocket mask:3;
emergency blanket|foil blanket|space blanket:3; instant cold pack|ice pack|cold pack:3; dressing|wound dressing|sterile dressing:3; crepe bandage|elastic bandage|ace bandage:3; first aid manual|first aid guide|first aid instructions:2; antihistamine|antihistamine tablets|allergy tablets:2; hydrocortisone cream:2; sting relief|insect bite cream:2; tourniquet:2; splint:2;
eye pad|eye dressing:2; steri-strips|butterfly stitches|butterfly closures|wound closure strips:2; saline solution|saline wipes|saline:2; alcohol wipes|alcohol swabs:2; hand sanitiser|hand sanitizer:2; torch|flashlight:2; blanket:2; blister plasters|blister pads:2; face mask:2; epipen|epinephrine auto-injector|adrenaline pen:2;
calamine lotion:2; cotton buds|cotton swabs|q-tips:2; whistle:1; notepad and pen:1; sunscreen:1; tick remover|tick tweezers:1; syringe:1; pulse oximeter:1; glucose tablets|glucose gel:1; oral rehydration salts|rehydration sachets:1;
rubbing alcohol|isopropyl alcohol:1; hydrogen peroxide:1; iodine|betadine|povidone iodine:1; petroleum jelly|vaseline:1; aloe vera:1; antidiarrhoeal|loperamide|imodium:1; eye drops:1; tissues:1; plastic bags|disposal bag:1; sterile water:1;
pen torch|penlight:1; hot pack:1; cotton pads:1; surgical gloves:1; sam splint:1; neck brace|cervical collar:1; spare batteries:1; medical scissors|trauma shears:2; magnifying glass:1; antacid:1;
rehydration tablets:1; throat lozenges:1; menthol rub:1; sunburn cream|after sun:1; insect repellent:1; water purification tablets:1; compression bandage:1; finger splint:1; cling film:1; bin bag:1;
hypoallergenic tape:1;
` },

  { id: "q-mind-human-bone", theme: "Medicine", ask: "Name a bone in the human body", what: "a bone in the human body", items: `
skull|cranium:5; femur|thigh bone|thighbone:5; rib|ribs|rib cage:5; spine|vertebra|backbone|spinal column|vertebrae:5; humerus:4; tibia|shin bone|shinbone:4; clavicle|collarbone|collar bone:4; scapula|shoulder blade:4; pelvis|hip bone|hipbone:4; sternum|breastbone:4;
patella|kneecap|knee cap:4; mandible|jawbone|jaw bone|jaw:4; coccyx|tailbone:4; fibula:3; radius:3; ulna:3; sacrum:3; carpals|carpal|wrist bones:3; phalanges|phalanx|finger bones|toe bones:3; stirrup|stapes:3;
hammer|malleus:3; anvil|incus:3; maxilla:2; metacarpals|metacarpal:2; tarsals|tarsal:2; metatarsals|metatarsal:2; talus|ankle bone:2; calcaneus|heel bone|heel:2; hyoid:2; atlas:2;
scaphoid:2; ilium:2; zygomatic|cheekbone|cheek bone:2; axis:1; cervical vertebrae|cervical:1; thoracic vertebrae|thoracic:1; lumbar vertebrae|lumbar:1; lunate:1; triquetrum:1; pisiform:1;
trapezium:1; trapezoid:1; capitate:1; hamate:1; cuboid:1; navicular:1; cuneiform:1; ischium:1; pubis:1; frontal bone|frontal:1;
parietal bone|parietal:1; temporal bone|temporal:1; occipital bone|occipital:1; sphenoid:1; ethmoid:1; nasal bone:1; lacrimal:1; vomer:1; palatine:1; inferior nasal concha:1;
manubrium:1; xiphoid process|xiphoid:1; floating ribs:1; sesamoid:1; fabella:1; ossicles:1; ear bones:1; proximal phalanx:1; distal phalanx:1; middle phalanx:1;
` },

  { id: "q-mind-disease", theme: "Medicine", ask: "Name a disease or illness", what: "a disease or illness", items: `
cold|common cold:5; flu|influenza:5; covid|covid-19|coronavirus:5; cancer:5; diabetes:5; asthma:4; measles:4; chickenpox|chicken pox:4; malaria:4; tuberculosis|tb:4;
pneumonia:4; arthritis:4; stroke:4; hiv|aids|hiv/aids:4; plague|black death|bubonic plague:4; alzheimer's|alzheimers|alzheimer's disease:4; dementia:4; parkinson's|parkinsons|parkinson's disease:4; heart disease|heart attack:3; cholera:3;
smallpox:3; polio:3; mumps:3; whooping cough|pertussis:3; tetanus|lockjaw:3; hepatitis:3; meningitis:3; dengue:3; ebola:3; leprosy|hansen's disease:3;
rabies:3; norovirus:3; food poisoning:3; tonsillitis:3; bronchitis:3; appendicitis:3; migraine:3; epilepsy:3; multiple sclerosis|ms:3; cystic fibrosis:3;
osteoporosis:3; anaemia|anemia:3; leukaemia|leukemia:3; hypertension|high blood pressure:3; eczema:3; psoriasis:3; acne:3; shingles:3; athlete's foot:3; cystitis|uti|urinary tract infection:3;
gout:3; coeliac disease|celiac disease:3; scurvy:3; rickets:3; scarlet fever:3; glandular fever|mono|mononucleosis:3; lyme disease:3; anthrax:3; sars:3; swine flu|h1n1:3;
bird flu|avian flu|h5n1:3; mpox|monkeypox:3; conjunctivitis|pink eye:3; cataracts|cataract:3; depression:3; anxiety:3; hay fever|allergic rhinitis:3; typhoid:2; rubella|german measles:2; diphtheria:2;
zika:2; yellow fever:2; salmonella:2; e. coli|e coli:2; gastroenteritis|stomach bug:2; sinusitis:2; muscular dystrophy:2; lymphoma:2; scabies:2; ringworm:2;
thrush:2; kidney stones:2; gallstones:2; lupus:2; crohn's disease|crohn's:2; irritable bowel syndrome|ibs:2; ulcer|stomach ulcer:2; legionnaires' disease|legionnaires:2; mers:2; glaucoma:2;
tinnitus:2; vertigo:2; insomnia:2; sleep apnoea|sleep apnea:2; schizophrenia:2; bipolar disorder:2; ocd:2; adhd:2; autism:2; anorexia:2;
bulimia:2; ptsd:2; anaphylaxis:2; sepsis:2; gangrene:2; hypothermia:2; heatstroke:2; dehydration:2; obesity:2; sickle cell disease|sickle cell anaemia:2;
haemophilia|hemophilia:2; huntington's disease|huntington's:2; motor neurone disease|als|lou gehrig's disease:2; melanoma:2; heart failure:2; angina:2; thrombosis|dvt:2; aneurysm:2; cirrhosis:2; hernia:2;
beriberi:1; pellagra:1; kwashiorkor:1; goitre|goiter:1; rheumatic fever:1; macular degeneration:1; hives|urticaria:1; croup:1; thalassaemia:1; hodgkin's lymphoma|hodgkin's:1;
sarcoma:1; arrhythmia:1; atrial fibrillation|afib:1; varicose veins:1; embolism:1; pancreatitis:1; diverticulitis:1; hypotension:1; typhus:1; trachoma:1;
river blindness|onchocerciasis:1; sleeping sickness:1; chagas disease:1; leishmaniasis:1; schistosomiasis|bilharzia:1; hookworm:1; tapeworm:1; guinea worm:1; elephantiasis|lymphatic filariasis:1; dysentery:1;
botulism:1; listeriosis|listeria:1; cryptosporidiosis:1; giardiasis|giardia:1; toxoplasmosis:1; q fever:1; brucellosis:1; tularemia:1; psittacosis:1; leptospirosis|weil's disease:1;
hantavirus:1; lassa fever:1; marburg virus|marburg:1; nipah virus:1; west nile virus|west nile:1; chikungunya:1; japanese encephalitis:1; tick-borne encephalitis:1; ross river fever:1; rift valley fever:1;
crimean-congo fever:1; hand foot and mouth disease:1; fifth disease:1; roseola:1; impetigo:1; cellulitis:1; mrsa:1; c. diff|c diff|clostridium difficile:1; bronchiolitis:1; emphysema:1;
copd:2; pulmonary fibrosis:1; sarcoidosis:1; pleurisy:1; pneumothorax:1; lung cancer:2; breast cancer:2; prostate cancer:2; bowel cancer|colon cancer:2; skin cancer:2;
brain tumour|brain tumor:2;
` },

  { id: "q-mind-medical-instrument", theme: "Medicine", ask: "Name something a doctor or nurse uses", what: "something a doctor or nurse uses", items: `
stethoscope:5; thermometer:5; syringe|needle:5; scalpel:4; forceps:4; blood pressure monitor|sphygmomanometer|blood pressure cuff|bp cuff:4; defibrillator|defib|aed:4; x-ray machine|x-ray:4; mri scanner|mri machine|mri:4; gloves|surgical gloves|latex gloves:4;
otoscope:3; reflex hammer|tendon hammer|patella hammer:3; tongue depressor|spatula:3; stitches|sutures|suture|surgical thread:3; cannula|iv line|drip:3; catheter:3; ecg machine|ecg|ekg|electrocardiogram:3; ultrasound machine|ultrasound:3; ct scanner|ct scan|cat scan:3; ventilator|respirator:3;
oxygen mask|oxygen tank:3; nebuliser|nebulizer|inhaler:3; pulse oximeter|oximeter:3; mask|surgical mask|face mask:3; stretcher|gurney:3; wheelchair:3; crutches:3; bandages|bandage:3; scissors:2; ophthalmoscope:2;
surgical clamp|clamp|haemostat|hemostat:2; retractor:2; glucometer|glucose monitor|blood glucose meter:2; torch|penlight|pen torch:2; tourniquet:2; gown|surgical gown|scrubs:2; hospital bed:2; drip stand|iv stand:2; microscope:2; endoscope:2;
dialysis machine:2; incubator:2; pacemaker:2; weighing scales|scales:2; eye chart|snellen chart|ishihara chart:2; swab|cotton swab:2; clipboard|patient notes|medical notes|chart:2; id badge|badge:1; pager|bleep:1; prescription pad|prescription:2;
bedpan:1; sharps bin:1; autoclave:1; centrifuge:1; petri dish:1; test tube:1; pipette:1; laryngoscope:1; bronchoscope:1; colonoscope:1;
laparoscope:1; arthroscope:1; cautery|diathermy:1; surgical drill:1; bone saw:1; surgical lamp|operating light:1; anaesthetic machine|anesthesia machine:1; heart-lung machine:1; infusion pump:1; syringe driver:1;
hearing aid:1; spirometer:1; peak flow meter:1; doppler:1; audiometer:1; tuning fork:1; tape measure:1; height chart:1; dental mirror:1; dental drill:1;
plaster cast:1; trocar:1; curette:1; lancet:1; vacutainer|blood collection tube:1; electrodes:1; monitor|heart monitor|patient monitor:2; saline bag|iv bag|drip bag:1; trolley|crash cart|medical trolley:1; computer|laptop:1;
phone:1; tablet|ipad:1; hand sanitiser|hand sanitizer:1; apron:1; hairnet|surgical cap|scrub cap:1; shoe covers|overshoes:1; face shield|visor:1; goggles|safety glasses:1; lead apron:1; ophthalmic slit lamp|slit lamp:1;
tonometer:1; retinoscope:1; refractor|phoropter:1; trial lenses:1; occluder:1;
` },

  { id: "q-mind-symptom", theme: "Medicine", ask: "Name a symptom of being ill", what: "a symptom of illness", items: `
cough:5; fever|high temperature|temperature:5; headache:5; sore throat:4; sneezing|sneeze:4; runny nose:4; nausea|feeling sick:4; vomiting|being sick|throwing up:4; diarrhoea|diarrhea:4; fatigue|tiredness|exhaustion:4;
dizziness|dizzy:4; rash:4; stomach ache|stomach pain|tummy ache|abdominal pain|belly ache:4; chills:3; sweating|night sweats:3; back pain:3; chest pain:3; shortness of breath|breathlessness:3; swelling:3; itching|itch:3;
muscle ache|aches|body aches:3; joint pain:3; blocked nose|stuffy nose|congestion:3; fainting|blackout:3; bleeding:3; heartburn|indigestion:3; earache:3; toothache:3; loss of appetite:2; weight loss:2;
insomnia:2; blurred vision:2; ringing in the ears|tinnitus:2; confusion:2; seizures|convulsions:2; palpitations:2; bruising:2; jaundice|yellow skin:2; constipation:2; bloating:2;
cramps:2; sore eyes|red eyes:2; watery eyes:2; swollen glands:2; hoarse voice|hoarseness:2; loss of smell:2; loss of taste:2; numbness:2; tingling|pins and needles:2; tremor|shaking:2;
weakness:2; wheezing:2; phlegm|mucus:2; stiff neck:2; blisters:2; memory loss:2; difficulty concentrating|brain fog:2; weight gain:1; sensitivity to light:1; hearing loss:1;
pale skin|pallor:1; sweaty palms:1; thirst:1; dry mouth:1; frequent urination:1; hives:1; cold sores:1; spots:1; lumps:1; hair loss:1;
brittle nails:1; dry skin:1; low mood:1; irritability:1; mood swings:1; hot flushes|hot flashes:1; cold hands:1; restless legs:1; sore muscles:1; stiffness:1;
sore gums:1; bad breath:1; blood in urine:1; blood in stool:1; coughing up blood:1; nosebleed:1; double vision:1; floaters:1; flashing lights:1; slurred speech:1;
drooping face:1; paralysis:1; loss of balance:1; vertigo:1; chapped lips:1; swollen ankles:1; cold sweat:1; clammy skin:1; rapid heartbeat|racing heart:2; slow heartbeat:1;
hunger:1; excessive thirst:1; sore tongue:1; difficulty swallowing:1; hiccups:1; belching:1; anxiety:1; panic attacks:1; hallucinations:1; delirium:1;
lethargy:2; malaise:2; aching limbs:1; watery stools:1; dehydration:1; shivering:2; goosebumps:1; yellow eyes:1;
` },

  { id: "q-mind-medical-pioneer", theme: "Medicine", ask: "Name a famous doctor, nurse or medical pioneer", what: "a famous doctor, nurse or medical pioneer", items: `
hippocrates:5; florence nightingale:5; alexander fleming|fleming:5; louis pasteur|pasteur:4; edward jenner|jenner:4; jonas salk|salk:4; marie curie|curie:4; joseph lister|lister:3; sigmund freud|freud:3; galen:3;
christiaan barnard|barnard:3; anthony fauci|fauci:3; elizabeth blackwell:3; mary seacole:3; john snow|dr john snow:3; wilhelm roentgen|rontgen|roentgen:3; william harvey|harvey:2; andreas vesalius|vesalius:2; ignaz semmelweis|semmelweis:2; robert koch|koch:2;
avicenna|ibn sina:2; frederick banting|banting:2; elizabeth garrett anderson:2; edith cavell:2; clara barton:2; paul ehrlich|ehrlich:2; rene laennec|laennec:2; john hunter:2; ambroise pare|pare:2; paracelsus:2;
imhotep:2; alois alzheimer|alzheimer:2; ivan pavlov|pavlov:2; charles drew:2; patrick steptoe|steptoe:2; robert edwards:2; albert schweitzer|schweitzer:2; albert sabin|sabin:2; virginia apgar|apgar:2; ben carson:2;
sanjay gupta:2; dr oz|mehmet oz:2; sophia jex-blake:2; howard florey|florey:2; charles best:1; william osler|osler:1; maimonides:1; hua tuo:1; sushruta:1; charaka:1;
ibn al-nafis:1; rhazes|al-razi:1; al-zahrawi|albucasis:1; avenzoar:1; thomas sydenham:1; thomas willis:1; james parkinson|parkinson:1; leo kanner:1; carl jung:1; santiago ramon y cajal|cajal:1;
camillo golgi|golgi:1; norman bethune:1; maurice hilleman:1; helen taussig:1; vivien thomas:1; james barry:1; elsie inglis:1; rebecca lee crumpler:1; daniel hale williams:1; harvey cushing|cushing:1;
wilder penfield:1; walter reed:1; ernst chain:1; archibald mcindoe|mcindoe:1; harold gillies|gillies:1; ludwig guttmann|guttmann:1; tu youyou:1; katalin kariko:1; ugur sahin:1; drew weissman:1;
james young simpson|simpson:1; john radcliffe:1; thomas addison:1; richard bright:1; thomas hodgkin:1; james lind:1; patrick manson:1; ronald ross:1; david livingstone:1; mary breckinridge:1;
virginia henderson:1; dorothea dix:1; jean henri dunant|henry dunant|dunant:1; mary mahoney:1; lillian wald:1; linda richards:1; sister kenny|elizabeth kenny:1; cicely saunders:2; frederick treves:1; hans selye:1;
viktor frankl:1; elisabeth kubler-ross|kubler-ross:2; oliver sacks:2; atul gawande:1; paul farmer:1; gertrude elion:1; hideyo noguchi|noguchi:1; shibasaburo kitasato|kitasato:1; emil von behring|von behring:1; karl landsteiner|landsteiner:2;
william beaumont:1; crawford long:1; horace wells:1; william morton:1; thomas lewis:1; werner forssmann|forssmann:1; rene favaloro|favaloro:1; michael debakey|debakey:2; denton cooley|cooley:1; alfred blalock:1;
clarence walton lillehei|lillehei:1; john gibbon:1; willem einthoven|einthoven:1; godfrey hounsfield|hounsfield:2; raymond damadian|damadian:1; paul lauterbur:1; peter mansfield:1; ian donald:2; antonie van leeuwenhoek|leeuwenhoek:2;
` },

  { id: "q-mind-medical-test", theme: "Medicine", ask: "Name a medical test, scan or procedure", what: "a medical test, scan or procedure", items: `
x-ray:5; blood test:5; surgery|operation:5; mri|mri scan:5; ct scan|cat scan|ct:4; ultrasound|ultrasound scan:4; biopsy:4; ecg|ekg|electrocardiogram:4; mammogram:4; vaccination|vaccine|injection|jab:4;
chemotherapy|chemo:4; cpr|resuscitation:4; blood pressure check|blood pressure test:3; urine test|urinalysis:3; swab test|swab|pcr test|covid test|lateral flow test:3; colonoscopy:3; endoscopy:3; smear test|pap smear|cervical screening:3; eye test|eye exam:3; hearing test:3;
stitches:3; transplant|organ transplant:3; transfusion|blood transfusion:3; dialysis:3; radiotherapy|radiation therapy:3; lumbar puncture|spinal tap:3; bypass surgery|heart bypass:3; appendectomy|appendicectomy:3; tonsillectomy:3; caesarean|c-section|cesarean:3;
amputation:3; physiotherapy|physical therapy:3; pregnancy test:3; health check|check-up|checkup:3; angiogram:2; echocardiogram|echo:2; eeg:2; spirometry|lung function test:2; allergy test|skin prick test:2; glucose test|blood sugar test:2;
cholesterol test:2; dna test|genetic test:2; amniocentesis:2; pet scan:2; bone density scan|dexa scan:2; laparoscopy|keyhole surgery:2; angioplasty:2; mastectomy:2; lobotomy:2; tracheotomy:2;
heimlich manoeuvre|heimlich maneuver:2; defibrillation:2; intubation:2; stress test|treadmill test:2; temperature check:2; blood glucose test:2; reflex test:2; vision test:2; skin test:2; emg:1;
bone marrow biopsy:1; barium swallow|barium meal:1; cystoscopy:1; hysterectomy:1; tuberculin test|mantoux test:1; patch test:1; height and weight check:1; weigh-in:1; throat swab:1; stool test:1;
sputum test:1; culture test:1; tissue biopsy:1; needle biopsy:1; fine needle aspiration:1; bronchoscopy:1; arthroscopy:1; gastroscopy:1; sigmoidoscopy:1; ct angiogram:1;
mri angiogram:1; fluoroscopy:1; scintigraphy:1; bone scan:1; thyroid scan:1; doppler scan:1; carotid ultrasound:1; abdominal ultrasound:1; pelvic ultrasound:1; fetal ultrasound|baby scan|dating scan:1;
nuchal scan:1; chorionic villus sampling|cvs:1; newborn screening|heel prick test:2; apgar score:1; glucose tolerance test:1; liver function test:1; kidney function test:1; thyroid function test:1; full blood count|fbc|cbc:1; blood group test|blood typing:1;
coagulation test|inr test:1; hba1c:1; psa test:1; occult blood test|fit test:1; tumour marker test:1; genetic screening:1; carrier screening:1; whole genome sequencing:1; exome sequencing:1; karyotyping:1;
fish test:1; pcr:1; elisa:1; western blot:1; antigen test:1; antibody test:1; rapid test:1; serology:1; immunisation|immunization:2; booster shot|booster:1;
flu jab|flu shot:2; tetanus jab:1; hpv vaccine:1; mmr vaccine:1; bcg vaccine:1; polio vaccine:1; covid vaccine:2; insulin injection:1; epidural:2; local anaesthetic:1;
general anaesthetic:2; spinal anaesthesia:1; nerve block:1; cortisone injection:1; botox injection:1; skin graft:1; bone graft:1; hip replacement:2; knee replacement:2; joint replacement:1;
heart transplant:2; kidney transplant:2; liver transplant:1; lung transplant:1; corneal transplant:1; bone marrow transplant|stem cell transplant:2; pacemaker implant:1; stent:1; valve replacement:1; cataract surgery:2;
laser eye surgery|lasik:2; root canal:2; filling:1; extraction|tooth extraction:2; scale and polish:1; plastic surgery:2; cosmetic surgery:1; rhinoplasty|nose job:2;
` },
]);

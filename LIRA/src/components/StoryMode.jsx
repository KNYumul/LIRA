import React, { useEffect, useRef, useState } from 'react';
import './StoryMode.css';

import coverSiDindoPundido from '../assets/icons/si-dindo-pundido.jpg';
import coverRosaAlbina from '../assets/icons/rosa-albina.jpg';
import coverAngPambihirangSombrero from '../assets/icons/ang-pambihirang-sombrero.jpg';
import coverThePowerOfLove from '../assets/icons/the-power-of-love.jpg';
import coverMarvinosLeague from '../assets/icons/marvinos-league-of-superheroes.jpg';
import coverLittleGirlInABox from '../assets/icons/the-little-girl-in-a-box.jpg';

const STORIES = [
  {
    id: 'si-dindo-pundido',
    title: 'Si Dindo Pundido',
    titleFil: 'Si Dindo Pundido',
    cover: coverSiDindoPundido,
    languageType: 'FIL',
    starred: true,
    pages: {
      FIL: [
        {
          highlight: 'Tuwing sasapit ang dilim, nabubuhay ang kagandahan ng hardin sa kislap ng mga alitaptap. ',
          rest: 'Sa kanilang munting mundo, sikat ang mga anak nina Don Fuego at Donya Luz. Ang panganay na si Silaw ang may ilaw na ubod ng lakas. Parang plaslayt naman ang diretsong ilaw ni Sinag. Sari-sari naman ang kulay ng kislap ni Kutitap. Dahil sa angking galing ng magkakapatid, pinanabikan ng lahat ang pagsilang sa bunso.'
        },
        {
          highlight: 'Nagpulong ang lahat at nag-abang sa pagsilang. Ngunit nagulat sila sa lumabas sa itlog — isang alitaptap na walang kislap! ',
          rest: '"Ay, wala siyang ilaw!" nagulat na sabi ni Silaw. "Tatawagin ko siyang Dindo!" pahayag naman ni Don Fuego. "Si Dindo Pundido!! Ha-ha-ha!" tukso ni Sinag.'
        },
        {
          highlight: 'Paglaki ni Dindo, labis niyang ikinahihiya ang pagkapundido. ',
          rest: '"Inay, espesyal din ba ako tulad nina Kuya at Ate?" nag-aalalang tanong ni Dindo. "Oo, anak. Espesyal tayong lahat. Ang kawalan mo ng ilaw ang nagpapabukod-tangi sa iyo," malambing na wika ni Donya Luz.'
        },
        {
          highlight: 'Kaya\'t sa sumunod na gabi, sinundan ni Dindo ang kanyang mga kapatid sa pag-asang mahanap ang kaniyang sariling kislap. ',
          rest: '"Kuya Silaw, gusto ko ring painitin ang bahay ni Landong Langgam!" ani Dindo. "Ang malakas kong ilaw lamang ang kayang magpainit dito!" sagot ni Silaw.'
        },
        {
          highlight: 'Nang makalaya na si Dindo mula sa pangungulit sa mga kapatid, bigla niyang narinig ang matinis na sigaw ni Kutitap: "Saklolo!" ',
          rest: 'Agad na bumalik si Dindo at nakita ang isang higanteng bote. Nakakulong dito ang kaniyang mga kapatid! Nakita rin niya ang ibang alitaptap na nagtatago sa takot.'
        },
        {
          highlight: 'Nagulat ang mga nagtatagong alitaptap nang lumapit si Dindo sa bote, kaya\'t tinadyakan niya ito, hinila, binatak, at sinipa. ',
          rest: 'Isa-isang nakalaya ang mga kapatid ni Dindo. Patakbong lumapit ang bata upang hulihin silang muli, ngunit lumitaw na hugis-multo ang mga kapatid kaya mabilis na tumakbo palayo ang bata.'
        },
        {
          highlight: '"Maraming salamat, Dindo!" wika nila. "Patawarin mo kami sa pagmamaliit namin sa iyo. Espesyal kang talaga!" ',
          rest: 'At nang gabing iyon, natuklasan ni Dindo ang kaniyang tunay na ningning.'
        }
      ],
      ENG: [
        {
          highlight: 'When night falls, the garden comes alive with the glow of fireflies. ',
          rest: 'Don Fuego and Donya Luz have brilliant children: Silaw with a powerful beam, Sinag with a straight flashlight-like glow, and Kutitap with multi-colored sparks. Everyone eagerly awaited the youngest\'s arrival.'
        },
        {
          highlight: 'To everyone\'s surprise, out of the egg came a firefly with no glow at all! ',
          rest: '"He has no light!" Silaw gasped. "I will call him Dindo!" Don Fuego declared. "Dindo Pundido (burnt out)! Ha-ha-ha!" Sinag teased.'
        },
        {
          highlight: 'As Dindo grew, he felt deeply ashamed of his lack of light. ',
          rest: '"Mother, am I special too?" Dindo worriedly asked. "Yes, child. Your lack of light makes you uniquely stand out," Donya Luz gently replied.'
        },
        {
          highlight: 'Seeking his true spark, Dindo followed his siblings into the garden at night. ',
          rest: 'When he asked to help warm Ant\'s house or find Butterfly\'s necklace, his siblings brushed him off, saying only their powerful lights mattered.'
        },
        {
          highlight: 'Suddenly, a shrill cry pierced the night: Kutitap shouted for help! ',
          rest: 'Dindo rushed back and saw his siblings trapped inside a giant glass bottle by a human child, while other fireflies hid in terror.'
        },
        {
          highlight: 'Gathering his courage, Dindo approached the bottle and kicked, pulled, and shoved it until it broke! ',
          rest: 'His siblings were freed. When the human child tried to catch them again, the fireflies formed a spooky ghost shape, scaring the child away.'
        },
        {
          highlight: '"Thank you so much, Dindo! Forgive us for underestimating you," his siblings cheered. ',
          rest: 'That night, Dindo finally discovered his true inner spark and brilliance.'
        }
      ]
    },
    quiz: {
      FIL: [
        { question: 'Sino-sino ang mga magulang ni Dindo?', options: ['Don Fuego at Doña Luz', 'Landong Langgam at Binibining Mariposa', 'Silaw at Sinag', 'Kutitap at Dindo'], correct: 0 },
        { question: 'Ano ang kakaibang katangian ni Dindo nang siya ay lumabas sa itlog?', options: ['May kulay-bahaghari ng ilaw', 'Wala siyang kislap o ilaw', 'Napakalakas ng kanyang ilaw', 'Umiilaw ang kanyang mga pakpak'], correct: 1 },
        { question: 'Sino ang panganay na kapatid ni Dindo na may napakalakas na ilaw?', options: ['Sinag', 'Kutitap', 'Silaw', 'Fuego'], correct: 2 },
        { question: 'Bakit tinawag na "Dindo Pundido" ng kaniyang kapatid na si Sinag ang bunso?', options: ['Dahil paborito niyang pangalan ito', 'Dahil ang salitang "pundido" ay nangangahulugang walang ilaw o patay ang ilaw', 'Dahil mabilis siyang lumipad', 'Dahil matulungin si Dindo'], correct: 1 },
        { question: 'Ano ang naramdaman ni Dindo noong tinatanggihan siya ng kanyang mga kapatid na tumulong?', options: ['Natuwa at nagpasalamat', 'Nalungkot at nag-alala kung paano mahahanap ang kanyang sariling kislap', 'Nagalit at nakipag-away', 'Natakot at nagtago'], correct: 1 },
        { question: 'Bakit HINDI nahuli ng bata si Dindo noong nanghuhuli ito ng mga alitaptap?', options: ['Dahil napakabilis lumipad ni Dindo', 'Dahil nagtago si Dindo sa ilalim ng lupa', 'Dahil wala siyang ilaw kaya hindi siya napansin ng bata sa dilim', 'Dahil tinulungan siya ni Donya Luz'], correct: 2 },
        { question: 'Bakit humingi ng tawad ang mga kapatid ni Dindo sa kaniya sa hulihan ng kuwento?', options: ['Dahil naisip nilang mali ang pagmamaliit at pagtukso nila kay Dindo', 'Dahil nasira nila ang laruan ni Dindo', 'Dahil hindi nila pinakain si Dindo', 'Dahil naiwan nila si Dindo sa bahay'], correct: 0 },
        { question: 'Tama ba ang ginawang pagtukso at pagtanggi nina Silaw, Sinag, at Kutitap kay Dindo noong una?', options: ['Opo, dahil wala namang pakinabang si Dindo', 'Hindi po, dahil masama ang mamaliit at manukso ng kapwa dahil lang sa kaniyang pagkakaiba', 'Opo, dahil mas magaling naman talaga sila', 'Hindi po, dahil dapat ay ipinamigay na lang nila si Dindo'], correct: 1 },
        { question: 'Anong magandang ugali ang ipinakita ni Dindo nang makita niyang nasa panganib ang kaniyang mga kapatid?', options: ['Katamaran at pagiging tahimik', 'Kahabagan, katapangan, at pagmamalasakit', 'Pagiging makasarili at mapagtanim ng galit', 'Pagiging matatakutin'], correct: 1 },
        { question: 'Ano ang pinakamahalagang aral na mapupulot sa kuwento ni Dindo Pundido?', options: ['Mas mahusay ang taong may pinakamatalas na kakayahan', 'Ang bawat isa ay may natatanging halaga at kakayahan na puwedeng makatulong sa iba', 'Huwag nang lalabas tuwing gabi upang hindi mahuli ng bata', 'Mas mabuting magtago na lamang kapag may problema'], correct: 1 }
      ],
      ENG: [
        { question: 'Who are Dindo\'s parents?', options: ['Don Fuego and Doña Luz', 'Landong Langgam and Binibining Mariposa', 'Silaw and Sinag', 'Kutitap and Dindo'], correct: 0 },
        { question: 'What was Dindo\'s unique trait when he hatched from the egg?', options: ['Rainbow lights', 'He had no spark or light', 'His light was extremely powerful', 'His wings glowed'], correct: 1 },
        { question: 'Who is Dindo\'s eldest sibling with the super powerful light?', options: ['Sinag', 'Kutitap', 'Silaw', 'Fuego'], correct: 2 },
        { question: 'Why did Sinag call the youngest sibling "Dindo Pundido"?', options: ['Because it was his favorite name', 'Because "pundido" means burnt out or without light', 'Because he flew fast', 'Because Dindo was helpful'], correct: 1 },
        { question: 'How did Dindo feel when his siblings refused to let him help?', options: ['Happy and grateful', 'Sad and worried about finding his own spark', 'Angry and fought back', 'Scared and hid'], correct: 1 },
        { question: 'Why did the human child NOT catch Dindo?', options: ['Dindo flew super fast', 'Dindo hid underground', 'He had no light, so the child didn\'t notice him in the dark', 'Donya Luz helped him'], correct: 2 },
        { question: 'Why did Dindo\'s siblings apologize to him at the end of the story?', options: ['They realized it was wrong to underestimate and tease him', 'They broke Dindo\'s toy', 'They didn\'t feed Dindo', 'They left Dindo at home'], correct: 0 },
        { question: 'Was it right for Silaw, Sinag, and Kutitap to tease and reject Dindo at first?', options: ['Yes, because Dindo was useless', 'No, because it is wrong to belittle others just for being different', 'Yes, because they were better', 'No, they should have given him away'], correct: 1 },
        { question: 'What good trait did Dindo show when his siblings were in danger?', options: ['Laziness and silence', 'Compassion, bravery, and care', 'Selfishness and bitterness', 'Cowardice'], correct: 1 },
        { question: 'What is the most important lesson from the story of Dindo Pundido?', options: ['The person with the sharpest skill is best', 'Everyone has unique value and abilities to help others', 'Never go out at night', 'It is better to hide when there is trouble'], correct: 1 }
      ]
    }
  },
  {
    id: 'rosa-albina',
    title: 'Rosa Albina',
    titleFil: 'Rosa Albina',
    cover: coverRosaAlbina,
    languageType: 'FIL',
    starred: false,
    pages: {
      FIL: [
        {
          highlight: 'Iba si Rosa Albina sa lahat ng kalabaw. Kaya si Rosa Albina ay laki sa layaw. ',
          rest: 'Dahil kulay-rosas ang kutis ng balat, sa init ay di mabibilad. Alagang-alaga ni Mang Teban si Rosa Albina sapagkat tuwing darating ang pista, si Rosa Albina ang reyna sa mga parada.'
        },
        {
          highlight: 'Ang dami-daming sa kaniya\'y humahanga. Pero maselan si Rosa Albina. Walang basta makaligaw sa kaniya. ',
          rest: 'Nang si Karbon Kareta ay mangahas magtapat ng taos na pagliyag, ang sagot ni Rosa Albina agad, "Ayoko nga sa maitim ang balat!"'
        },
        {
          highlight: 'At sapagkat talagang lumaking maselan, ni ayaw padapo sa tagak at langaw. Kung lumakad, laging tikwas ang nguso sa yabang. ',
          rest: '"Di bale," pagmamalaki niya. "Bahala si Mang Teban. Tiyak na hindi niya ako pababayaan." Nagtiis siya maghapon sa loob ng balon. At sa init ng araw, sumakit ang likod at ilong.'
        },
        {
          highlight: 'Maya-maya\'y dumilim. At bumuhos ang ulan. Ang tubig sa balon ay lumalim nang dahan-dahan. Natakot si Rosa Albina! ',
          rest: 'Umunga siya nang umunga! Malulunod tiyak siya kapag walang naawa! Salamat na lamang at dumating si Mang Teban at naawang tumulong ang ibang kalabaw.'
        },
        {
          highlight: 'Mula noon, nagbago ang mayabang na si Rosa Albina. Natuto siyang gumawa at natutong makisama. ',
          rest: 'Umibig si Rosa kay Karbon Kareta. Nagkaanak sila ng dalawa, at si Rosa Albina ay naging ulirang ina.'
        }
      ],
      ENG: [
        {
          highlight: 'Rosa Albina was unlike any other carabao, pampered and spoiled. ',
          rest: 'Because her skin had a pinkish complexion, she could not be exposed to the heat. Mang Teban cared for her deeply because she was the queen of the parades during fiestas.'
        },
        {
          highlight: 'Many admired her, but Rosa Albina was very picky and proud. ',
          rest: 'When Karbon Kareta dared to profess his true love, Rosa Albina immediately answered, "I don\'t like someone with dark skin!"'
        },
        {
          highlight: 'Growing up spoiled, she refused to let egrets or flies land on her, walking with a proud, upturned snout. ',
          rest: '"Never mind," she boasted. "Mang Teban will take care of me." She spent the whole day hiding inside a well to avoid mud, enduring back and nose aches from the sun.'
        },
        {
          highlight: 'Soon, it grew dark and rain poured. The water in the well slowly rose and Rosa Albina grew terrified! ',
          rest: 'She bellowed and bellowed, sure she would drown without mercy! Thankfully, Mang Teban arrived and other carabaos graciously helped save her.'
        },
        {
          highlight: 'From then on, the arrogant Rosa Albina changed, learning how to work and get along with others. ',
          rest: 'She fell in love with Karbon Kareta, they had two children, and Rosa Albina became a model mother.'
        }
      ]
    },
    quiz: {
      FIL: [
        { question: 'Ano ang kakaibang kulay ng balat ni Rosa Albina na ikinaiba niya sa ibang mga kalabaw?', options: ['Kulay itim', 'Kulay rosas', 'Kulay abo', 'Kulay kayumanggi'], correct: 1 },
        { question: 'Bakit paborito at inaalagang mabuti si Rosa Albina ni Mang Teban?', options: ['Dahil siya ang reyna sa mga parada tuwing may pista', 'Dahil mabilis siyang tumakbo sa bukid', 'Dahil magaling siyang magdala ng mabibigat na karga', 'Dahil siya ang nagbabantay sa kanilang bahay'], correct: 0 },
        { question: 'Sino ang kalabaw na nagtapat ng pag-ibig kay Rosa Albina ngunit tinanggihan niya dahil sa kulay nito?', options: ['Mang Teban', 'Tagak', 'Karbon Kareta', 'Langaw'], correct: 2 },
        { question: 'Saan nagtago si Rosa Albina nang siya ay magmaganda at ayaw maputikan sa labas?', options: ['Sa loob ng balon', 'Sa lilim ng puno', 'Sa gilid ng ilog', 'Sa loob ng bahay'], correct: 0 },
        { question: 'Ano ang ipinapakita ng sinabi ni Rosa Albina na "Ayoko nga sa maitim ang balat!" kay Karbon Kareta?', options: ['Natatakot siya sa dilim', 'Mayabang siya at mapili sa panlabas na anyo', 'Gusto niya munang maglaro', 'Pagod na siyang lumakad'], correct: 1 },
        { question: 'Bakit kaya natakot nang husto si Rosa Albina habang siya ay nasa loob ng tumataas na tubig sa balon?', options: ['Naisip niyang hindi sapat ang kanyang kagandahan at kayabangan para iligtas ang sarili', 'Nawala ang kanyang paboritong laruan', 'Nagutom siya nang husto sa loob', 'Natatakot siya sa mga isda sa tubig'], correct: 0 },
        { question: 'Ano ang natutuhan ni Rosa Albina pagkatapos siyang iligtas mula sa balon?', options: ['Natuto siyang maging sikat at laging magtago', 'Natuto siyang magpakumbaba at makisama sa iba', 'Natuto siyang tumakbo nang mabilis', 'Natuto siyang lumayo sa mga tao'], correct: 1 },
        { question: 'Sa iyong palagay, tama ba ang ginawa ng mga kalabaw na tulungan pa rin si Rosa Albina kahit naging mayabang siya sa kanila?', options: ['Hindi, kasi dapat ay pinabayaan na lang siya', 'Opo, dahil mas mahalaga ang pagtulong sa kapwa sa oras ng panganib kaysa sa paghihiganti', 'Hindi, dahil baka mapahamak din sila', 'Opo, para lamang purihin sila ni Mang Teban'], correct: 1 },
        { question: 'Ano ang magandang aral na matututuhan natin sa kuwento ni Rosa Albina?', options: ['Ang panlabas na ganda at kayabangan ay mas mahalaga kaysa sa kabutihan', 'Huwag maging mayabang at matutong rumespeto at makisama sa kapwa', 'Kailangan laging magtago sa balon tuwing may ulan', 'Dapat ay piliin lamang ang kakaibang kulay ng kaibigan'], correct: 1 },
        { question: 'Kung ikaw si Rosa Albina, ano ang gagawin mo kapag may lumapit sa iyong kapwa kalabaw?', options: ['Aalis ako at magtatago dahil baka madumihan ako', 'Pagtatawanan ko siya dahil hindi siya kasing ganda ko', 'Kakausapin ko siya nang maayos at makikipagkaibigan ako', 'Hindi ko siya papansinin dahil mas gusto kong mapag-isa'], correct: 2 }
      ],
      ENG: [
        { question: 'What was Rosa Albina\'s unusual skin color?', options: ['Black', 'Pink', 'Ash grey', 'Brown'], correct: 1 },
        { question: 'Why was Rosa Albina favored and cared for by Mang Teban?', options: ['She was the queen in parades during fiestas', 'She ran fast', 'She carried heavy loads', 'She guarded the house'], correct: 0 },
        { question: 'Who confessed his love to Rosa Albina but was rejected because of his skin color?', options: ['Mang Teban', 'Tagak', 'Karbon Kareta', 'Langaw'], correct: 2 },
        { question: 'Where did Rosa Albina hide to avoid getting muddy?', options: ['Inside a well', 'Under a tree shade', 'By the river', 'Inside the house'], correct: 0 },
        { question: 'What does Rosa Albina\'s statement "I don\'t like dark skin!" show?', options: ['She is afraid of the dark', 'She is arrogant and picky about outer appearance', 'She wants to play', 'She is tired of walking'], correct: 1 },
        { question: 'Why did Rosa Albina become so terrified inside the rising water of the well?', options: ['She realized her beauty and arrogance weren\'t enough to save her', 'She lost her favorite toy', 'She grew hungry', 'She was afraid of fish'], correct: 0 },
        { question: 'What did Rosa Albina learn after being rescued from the well?', options: ['To be famous and always hide', 'To be humble and get along with others', 'To run fast', 'To stay away from people'], correct: 1 },
        { question: 'Was it right for the carabaos to help Rosa Albina despite her arrogance?', options: ['No, they should have left her', 'Yes, helping others in danger matters more than revenge', 'No, they might get harmed', 'Yes, just to please Mang Teban'], correct: 1 },
        { question: 'What is the good moral of Rosa Albina\'s story?', options: ['Outer beauty and arrogance are superior', 'Do not be arrogant; learn to respect and get along with others', 'Always hide in wells when it rains', 'Choose friends based on skin color'], correct: 1 },
        { question: 'If you were Rosa Albina, what would you do if another carabao approached you?', options: ['Walk away and hide to avoid dirt', 'Laugh at her for not being as pretty', 'Talk to her nicely and make friends', 'Ignore her to be alone'], correct: 2 }
      ]
    }
  },
  {
    id: 'ang-pambihirang-sombrero',
    title: 'Ang Pambihirang Sombrero',
    titleFil: 'Ang Pambihirang Sombrero',
    cover: coverAngPambihirangSombrero,
    languageType: 'FIL',
    starred: false,
    pages: {
      FIL: [
        {
          highlight: 'Mahilig mangolekta ng kakaibang mga gamit si Mia. Isang araw naghalungkat si Mia sa lumang baul ng kanyang lola. ',
          rest: 'Laking tuwa niya nang makatagpo siya ng sombrero. Kakaiba ang itsura nito! Humarap si Mia sa salamin para sukatin ang sombrero ngunit naisip niyang parang may kulang.'
        },
        {
          highlight: 'Lumabas ng bahay si Mia at nagtungo sa tindahan sa tapat. "Manang Sol, maganda po ba ang aking sombrero?" ',
          rest: '"Oo Mia, pero mas maganda kung lalagyan pa natin ng alkansya," sagot ng tindera. Sunod niyang pinuntahan si Mang Rico sa panaderya na nagmungkahi ng kandelabra.'
        },
        {
          highlight: 'Nagdaan din si Mia kay Doktora Dulce na naglagay ng mga prutas, at kay Mang Ador sa istasyon ng bumbero na nagdagdag ng akwaryum. ',
          rest: 'Nakasalubong din niya ang pulis na si Mang Kalor na nagkabit ng hawla, at si Mang Lito sa hardin na naglagay ng mga bulaklak.'
        },
        {
          highlight: 'Pagdating sa palaruan, sinabi ng kalarong si Toto na saranggola na lamang ang kulang. Naitali ni Toto ang saranggola at biglang umihip ang napakalakas na hangin! ',
          rest: 'Natangay si Mia paitaas sa mga ulap. Lumobo ang sombrero at naging napakalaking parasiyut na nagpakita ng kahanga-hangang ganda!'
        }
      ],
      ENG: [
        {
          highlight: 'Mia loved collecting unique items. One day, she rummaged through her grandmother\'s old chest and found a strange hat. ',
          rest: 'She tried it on in front of the mirror, but felt something was missing.'
        },
        {
          highlight: 'Mia stepped outside and visited nearby stores. "Manang Sol, is my hat pretty?" she asked. ',
          rest: '"Yes Mia, but it would be prettier with a piggy bank," the shopkeeper replied. Next, she visited Mang Rico the baker who suggested adding a candelabra.'
        },
        {
          highlight: 'Mia also passed by Dr. Dulce who added fruits, and Mang Ador at the fire station who added an aquarium. ',
          rest: 'She met Mang Kalor the policeman who suggested a cage, and Mang Lito at the park garden who added flowers.'
        },
        {
          highlight: 'At the playground, her friend Toto tied a kite to her hat. Suddenly, a strong gust of wind blew and swept Mia up into the clouds! ',
          rest: 'Her hat expanded into a massive parachute, revealing its magnificent and wonderful beauty to everyone.'
        }
      ]
    },
    quiz: {
      FIL: [
        { question: 'Sino ang pangunahing tauhan sa kwento na nakakita ng lumang sombrero sa baul ng kanyang lola?', options: ['Mia', 'Maya', 'Maria', 'Lea'], correct: 0 },
        { question: 'Saan nakuha ni Mia ang kanyang kakaibang sombrero?', options: ['Sa lumang baul ng kanyang lola', 'Binili niya sa tindahan', 'Sa istasyon ng bumbero', 'Pinulot niya sa palaruan'], correct: 0 },
        { question: 'Anong bagay ang idinagdag ni Doktora Dulce nang magdaan si Mia sa klinika?', options: ['Akwaryum', 'Mga prutas', 'Hawla', 'Kandelabra'], correct: 1 },
        { question: 'Ano ang nangyari sa sombrero ng humipan ang napakalakas na hangin at makarating si Mia sa mga ulap?', options: ['Nasira at napunit ito', 'Lumobo ito at naging isang napakalaking parasiyut', 'Nahulog ito sa kalsada', 'Nawala ito sa dagat'], correct: 1 },
        { question: 'Batay sa mga usapan sa kwento, anong uri ng bata si Mia sa kanyang mga kapitbahay?', options: ['Magalang, palakaibigan, at marunong magpasalamat', 'Pasaway at maingay sa kalsada', 'Mahiyain at ayaw makipag-usap sa matatanda', 'Mapaghangad at masungit'], correct: 0 },
        { question: 'Bakit lumabas ng bahay si Mia at nagtanong sa kanyang mga kapitbahay pagkasukat ng sombrero?', options: ['Dahil gusto niyang ipagmalaki ang pananamit niya', 'Dahil nararamdaman niyang parang may kulang pa sa kanyang sombrero', 'Dahil pinipilit siya ng kanyang lola', 'Dahil gusto niyang ibenta ang sombrero sa iba'], correct: 1 },
        { question: 'Ano ang ipinapakita ng pagbibigay ng iba\'t ibang bagay ng mga tao sa pamayanan para sa sombrero ni Mia?', options: ['Sila ay galit at gustong makipag-away kay Mia', 'Sila ay matulungin, bukas-palad, at masayang nakikipag-usap sa kaniya', 'Gusto lang nilang itapon ang kanilang mga lumang gamit', 'Nais nilang gawing mabigat ang sombrero ni Mia'], correct: 1 },
        { question: 'Mabuti bang ugali ang ipinakita ni Mia sa tuwing tatanggap siya ng palamuti sa kanyang mga kapitbahay?', options: ['Hindi, dahil dapat ay tinanggihan niya ang mga ito', 'Opo, dahil lagi siyang nagpapasalamat at bukas ang loob sa tulong at mungkahi ng iba', 'Hindi, dahil ginawa niyang katawa-tawa ang kaniyang sombrero', 'Opo, para maipagbili niya ang mga gamit sa ibang tao'], correct: 1 },
        { question: 'Tama ba na pinakinggan at tinanggap ni Mia ang mga mungkahi ng iba para sa kanyang sombrero?', options: ['Opo, dahil ang pagiging bukas sa ideya ng iba ay makatutulong upang makabuo ng mas pambihira at magandang likha', 'Hindi, dahil dapat ang sarili niyang kagustuhan lamang ang nasusunod', 'Opo, pero dapat nagalit siya noong nadagdagan ang palamuti', 'Hindi, dahil nakikialam lang ang mga tao sa paligid niya'], correct: 0 },
        { question: 'Bakit magandang ehemplo sa mga bata ang karakter ni Mia?', options: ['Dahil gusto niyang lumipad sa hangin araw-araw', 'Dahil ipinapakita niya ang pagiging malikhain, magalang sa nakatatanda, at masayahin sa pakikitungo sa iba', 'Dahil nanghihingi siya ng mga gamit sa kalsada', 'Dahil naghahanap siya ng lumang baul sa bahay ng iba'], correct: 1 }
      ],
      ENG: [
        { question: 'Who is the main character who found an old hat in her grandmother\'s chest?', options: ['Mia', 'Maya', 'Maria', 'Lea'], correct: 0 },
        { question: 'Where did Mia get her unusual hat?', options: ['In her grandmother\'s old chest', 'Bought it from a shop', 'At the fire station', 'Picked it up at the playground'], correct: 0 },
        { question: 'What item did Dr. Dulce add when Mia passed by the clinic?', options: ['Aquarium', 'Fruits', 'Cage', 'Candelabra'], correct: 1 },
        { question: 'What happened to the hat when strong winds blew and Mia reached the clouds?', options: ['It ripped and tore', 'It expanded and turned into a huge parachute', 'It fell onto the road', 'It got lost at sea'], correct: 1 },
        { question: 'What kind of child was Mia based on her conversations with neighbors?', options: ['Polite, friendly, and grateful', 'Naughty and noisy', 'Shy and uncommunicative', 'Greedy and grumpy'], correct: 0 },
        { question: 'Why did Mia leave the house and ask her neighbors after trying on the hat?', options: ['To show off her clothes', 'She felt something was still missing from her hat', 'Her grandmother forced her', 'To sell the hat'], correct: 1 },
        { question: 'What does the community\'s contribution of items for Mia\'s hat show?', options: ['They are angry and want to fight', 'They are helpful, generous, and joyful in talking with her', 'They wanted to throw away old junk', 'They wanted to make her hat heavy'], correct: 1 },
        { question: 'Did Mia show good behavior when receiving decorations from her neighbors?', options: ['No, she should have refused', 'Yes, because she was always grateful and open to suggestions', 'No, she made her hat ridiculous', 'Yes, to sell the items'], correct: 1 },
        { question: 'Was it right for Mia to listen and accept others\' suggestions for her hat?', options: ['Yes, being open to ideas helps create wonderful masterpieces', 'No, only personal preferences matter', 'Yes, but she should have gotten angry', 'No, neighbors were meddling'], correct: 0 },
        { question: 'Why is Mia a good role model for children?', options: ['She wants to fly daily', 'She shows creativity, respect for elders, and a cheerful attitude', 'She begs for items on the street', 'She searches others\' chests'], correct: 1 }
      ]
    }
  },
  {
    id: 'the-power-of-love',
    title: 'The Power of Love',
    titleFil: 'Ang Kapangyarihan ng Pag-ibig',
    cover: coverThePowerOfLove,
    languageType: 'ENG',
    starred: false,
    pages: {
      ENG: [
        {
          highlight: 'Little Bear had been playing in the bright and sunny wood. ',
          rest: 'Soon trees cast long shadows and he was unsure if home was down the left path or the right. Friendly woodland fireflies appeared to help.'
        },
        {
          highlight: '"Think of a happy memory, then wish and close your eyes," the firefly buzzed. ',
          rest: 'Little Bear thought of going to the sea with Mummy, making sandcastles and eating ice cream. The fireflies glowed brighter as he remembered.'
        },
        {
          highlight: 'Then suddenly, a scary shape flew overhead with a huge beak and wings. ',
          rest: 'Little Bear forgot his happy thoughts, and because he was afraid, the fireflies lost their spark in the dark wood.'
        },
        {
          highlight: '"I\'m just a friendly owl," an owl hooted. "Remember, use the power of love." ',
          rest: 'Little Bear recalled baking cookies with Daddy during a storm. The fireflies burst back into light, safely guiding him home to Mummy and Daddy\'s warm hugs.'
        }
      ],
      FIL: [
        {
          highlight: 'Si Little Bear ay naglalaro sa maliwanag na gubat. ',
          rest: 'Ngunit dumilim ang paligid at hindi niya alam kung sa kaliwa o kanan ang pauwi. Lumitaw ang mga alitaptap upang tumulong.'
        },
        {
          highlight: '"Alalahanin ang masayang alaala, humiling at ipikit ang mga mata," sabi ng alitaptap. ',
          rest: 'Naalala ni Little Bear ang pamamasyal sa dagat kasama si Mommy. Sumiwalat at kumislap nang maliwanag ang mga alitaptap.'
        },
        {
          highlight: 'Maya-maya\'y may lumipad na nakatatakot na hugis na may malaking tuka. ',
          rest: 'Nawala sa isip ni Little Bear ang masasayang alaala at nawalan ng liwanag ang mga alitaptap sa takot.'
        },
        {
          highlight: '"Kaibigan lamang ako," wika ng kuwago. "Gamitin ang kapangyarihan ng pag-ibig." ',
          rest: 'Naalala ni Little Bear ang pagluluto ng cookies kasama si Daddy. Muling nagningning ang mga alitaptap at naihatid siya pauwi sa yakap ng magulang.'
        }
      ]
    },
    quiz: {
      ENG: [
        { question: 'Where was Little Bear playing before it started getting dark?', options: ['By the ocean', 'In a bright and sunny wood', 'Inside his cave', 'On a farm'], correct: 1 },
        { question: 'What was Little Bear’s happy memory when he closed his eyes the first time?', options: ['Baking cookies during a storm', 'Going to the sea with his mummy', 'Playing hide and seek with an owl', 'Flying a kite in the park'], correct: 1 },
        { question: 'What happened to the fireflies when Little Bear thought of happy memories?', options: ['They flew away', 'They changed colors', 'They shone brighter and grew in light', 'They fell asleep'], correct: 2 },
        { question: 'How do the fireflies get their power to shine?', options: ['From eating sweet berries in the forest', 'From the warmth of the sun', 'From happy memories and thoughts of love', 'From sleeping inside a jar'], correct: 2 },
        { question: 'What does the "power of love" represent in the story?', options: ['A physical magic wand', 'The comforting feeling of happy family memories that gives courage', 'A secret map', 'The ability to fly'], correct: 1 },
        { question: 'How did Little Bear\'s feelings change throughout his journey home?', options: ['From happy, to lost and scared, to brave and comforted', 'From angry to excited', 'From scared to mad', 'From sleepy to energetic'], correct: 0 },
        { question: 'Why did the fireflies lose their light when the owl flew overhead?', options: ['Fear replaced Little Bear\'s happy thoughts', 'Wind blew them out', 'They got tired', 'Nighttime ended'], correct: 0 },
        { question: 'Was it a good idea for Little Bear to listen to the fireflies\' advice?', options: ['No, fireflies cannot talk', 'Yes, focusing on positive thoughts helped him stay calm and find his way', 'No, he should have stayed', 'Yes, to make fire'], correct: 1 },
        { question: 'What is the main lesson or moral of "The Power of Love"?', options: ['Never walk in forest', 'Love and cherished memories can give us courage during fearful times', 'Avoid owls', 'Baking cookies solves everything'], correct: 1 },
        { question: 'What makes Little Bear a relatable character for young students?', options: ['He lives in the city', 'He experiences real feelings like getting lost and wanting his parents', 'He can fly', 'He cooks meals'], correct: 1 }
      ],
      FIL: [
        { question: 'Saan naglalaro si Little Bear bago dumilim?', options: ['Sa tabi ng dagat', 'Sa maliwanag na gubat', 'Sa loob ng kweba', 'Sa bukid'], correct: 1 },
        { question: 'Ano ang masayang alaala ni Little Bear nang pumikit siya sa unang pagkakataon?', options: ['Pagbakes ng cookies', 'Pagpunta sa dagat kasama si Mommy', 'Paglalaro ng taguan', 'Pagpapalipad ng saranggola'], correct: 1 },
        { question: 'Ano ang nangyari sa mga alitaptap nang isipin ni Little Bear ang masasayang alaala?', options: ['Lumipad sila palayo', 'Nagbago kulay', 'Sumiwalat at kumislap nang mas maliwanag', 'Nakatulog sila'], correct: 2 },
        { question: 'Paano nakukuha ng mga alitaptap ang kapangyarihan nilang suminag?', options: ['Sa pagkain ng berries', 'Sa init ng araw', 'Mula sa masasayang alaala at pagmamahal', 'Sa pagtulog sa garapon'], correct: 2 },
        { question: 'Ano ang kinakatawan ng "kapangyarihan ng pag-ibig" sa kuwento?', options: ['Isang magic wand', 'Ang pakiramdam ng masasayang alaala na nagbibigay ng tapang', 'Isang lihim na mapa', 'Kakayahang lumipad'], correct: 1 },
        { question: 'Paano nagbago ang damdamin ni Little Bear sa kanyang pag-uwi?', options: ['Masaya, naligaw at natakot, naging matapang at panatag', 'Galit sa nasabik', 'Natakot sa nagalit', 'Antok sa masigla'], correct: 0 },
        { question: 'Bakit nawalan ng liwanag ang mga alitaptap nang dumaan ang kuwago?', options: ['Pinalitan ng takot ang masasayang isip ni Little Bear', 'Hinipan ng hangin', 'Napagod sila', 'Natapos ang gabi'], correct: 0 },
        { question: 'Mabuti bang ideya na nakinig si Little Bear sa payo ng mga alitaptap?', options: ['Hindi, hindi nagsasalita ang alitaptap', 'Oo, nakatulong ang positibong pag-iisip upang kumalma at mahanap ang daan', 'Hindi, dapat nagtago siya', 'Oo, para magka-ilaw'], correct: 1 },
        { question: 'Ano ang pangunahing aral ng "The Power of Love"?', options: ['Huwag maglakad sa gubat', 'Ang pagmamahal at magagandang alaala ay nagbibigay ng tapang sa oras ng takot', 'Iwasan ang mga kuwago', 'Magluto ng cookies'], correct: 1 },
        { question: 'Bakit madaling iugnay si Little Bear sa mga mag-aaral?', options: ['Nakatira siya sa lungsod', 'Nararanasan niya ang tunay na damdamin tulad ng pagkawalay at paghanap sa mga magulang', 'Marunong siyang lumipad', 'Nagluluto siya'], correct: 1 }
      ]
    }
  },
  {
    id: 'marvinos-league-of-superheroes',
    title: "Marvino's League of Superheroes",
    titleFil: 'Ang Liga ng mga Bayani ni Marvino',
    cover: coverMarvinosLeague,
    languageType: 'ENG',
    starred: false,
    pages: {
      ENG: [
        {
          highlight: 'In the town of Majayjay, a museum of toys was newly opened, filled with superheroes. ',
          rest: 'Marvino wanted to enter, but could not afford the entrance fee. Instead, he kept a notebook full of drawings of superheroes inspired by valiant Filipino heroes.'
        },
        {
          highlight: 'One day, Marvino saw a wheelchair-bound man drawing outside the museum. ',
          rest: 'They struck up a friendly conversation. Marvino shared his sketches of historical heroes given superpowers, like Tandang Sora as a healer and Emilio Jacinto as a mage.'
        },
        {
          highlight: 'After a while, Mr. Emilio stopped appearing outside the gate. ',
          rest: 'Marvino felt sad, especially when he failed to win the school poster-making contest about Independence Day.'
        },
        {
          highlight: 'Soon after, free admission was announced at the museum! ',
          rest: 'Inside, Marvino was stunned to discover that Mr. Emilio was the owner and sculptor who had turned his exact notebook drawings into the grand exhibit: "League of National Heroes by Marvino Alonso."'
        }
      ],
      FIL: [
        {
          highlight: 'Sa bayan ng Majayjay, isang museo ng mga laruan ang binuksan. ',
          rest: 'Nais pumasok ni Marvino ngunit hindi niya kaya ang bayad sa entrada. Sa halip, nagtago siya ng kuwaderno na puno ng drowing ng mga bayaning Pilipino.'
        },
        {
          highlight: 'Isang araw, nakita ni Marvino ang isang lalaking nasa wheelchair na nagdidrowing sa labas. ',
          rest: 'Nagkuwentuhan sila at ibinahagi ni Marvino ang kanyang mga drowing ng bayaning may superpowers tulad ni Tandang Sora.'
        },
        {
          highlight: 'Makalipas ang ilang araw, hindi na lumitaw si Mr. Emilio sa labas. ',
          rest: 'Nalungkot si Marvino, lalo na nang hindi siya nanalo sa poster-making contest sa paaralan.'
        },
        {
          highlight: 'Maya-maya\'y nagkaroon ng libreng pasok sa museo! ',
          rest: 'Laking gulat ni Marvino nang malamang si Mr. Emilio ang may-ari at eskultor na gumawa ng kanyang mga drowing bilang eksibit na "League of National Heroes ni Marvino Alonso."'
        }
      ]
    },
    quiz: {
      ENG: [
        { question: 'Why could Marvino NOT enter the toy museum at first?', options: ['Children were banned', 'It was closed', 'He could not afford the entrance fee', 'He was afraid'], correct: 2 },
        { question: 'What did Marvino keep in his notebook?', options: ['Homework', 'Drawings of superheroes and Filipino heroes', 'Shopping list', 'Autographs'], correct: 1 },
        { question: 'What school event did Marvino want to join?', options: ['Quiz bee', 'Poster-making contest about Independence Day', 'Toy building', 'Costume parade'], correct: 1 },
        { question: 'Which hero did Marvino draw as "Tandang Sora, the Healer"?', options: ['Gabriela Silang', 'Gregoria de Jesus', 'Melchora Aquino', 'Apolinario Mabini'], correct: 2 },
        { question: 'How did Marvino feel when he didn\'t see Mr. Emilio outside?', options: ['Glad', 'Sad, thinking Mr. Emilio didn\'t want to be his friend anymore', 'Angry', 'Excited'], correct: 1 },
        { question: 'What does "Dimasilaw" represent for Emilio Jacinto in Marvino\'s notebook?', options: ['Fast runner', 'Powerful writings that inspired Katipuneros', 'Gun skills', 'Healing powers'], correct: 1 },
        { question: 'At the end, Marvino realized losing battles makes heroes more magnificent. Do you agree?', options: ['No, heroes must always win', 'Yes, true strength comes from bouncing back and learning from failure', 'No, losing means failure', 'Yes, so you stop trying'], correct: 1 },
        { question: 'Is incorporating history into superhero stories a good way to learn?', options: ['No, read textbooks only', 'Yes, it replaces school', 'No, history heroes had no capes', 'Yes, it makes learning exciting and memorable'], correct: 3 },
        { question: 'Why is not giving up after losing a contest important?', options: ['Winning is everything', 'True success comes from practicing what you love despite disappointment', 'Judges are always wrong', 'Only enter guaranteed wins'], correct: 1 },
        { question: 'Was Marvino right to keep drawing despite not having toys?', options: ['No, drawing is a waste', 'No, buy toys instead', 'Yes, imagination helped develop his amazing talent', 'Yes, if money is earned'], correct: 2 }
      ],
      FIL: [
        { question: 'Bakit HINDI makapasok si Marvino sa museo ng laruan noong una?', options: ['Bawal ang bata', 'Sarado ito', 'Hindi niya kaya ang bayad sa entrada', 'Takot siya'], correct: 2 },
        { question: 'Ano ang tinago ni Marvino sa kanyang kuwaderno?', options: ['Takdang-aralin', 'Mga drowing ng superhero at bayaning Pilipino', 'Listahan ng bibilhin', 'Lagda'], correct: 1 },
        { question: 'Anong kaganapan sa paaralan ang nais salihan ni Marvino?', options: ['Quiz bee', 'Poster-making contest tungkol sa Araw ng Kalayaan', 'Paggawa ng laruan', 'Parada'], correct: 1 },
        { question: 'Sino ang idinrowing ni Marvino bilang "Tandang Sora, the Healer"?', options: ['Gabriela Silang', 'Gregoria de Jesus', 'Melchora Aquino', 'Apolinario Mabini'], correct: 2 },
        { question: 'Ano ang naramdaman ni Marvino nang hindi na niya makita si Mr. Emilio sa labas?', options: ['Natuwa', 'Nalungkot dahil akala niya ayaw na nitong maging kaibigan siya', 'Nagalit', 'Nasabik'], correct: 1 },
        { question: 'Ano ang kinakatawan ng "Dimasilaw" para kay Emilio Jacinto?', options: ['Mabilis tumakbo', 'Makapangyarihang sulatin na nag-inspire sa mga Katipunero', 'Kasanayan sa baril', 'Kakayahang magpagaling'], correct: 1 },
        { question: 'Sa huli, napagtanto ni Marvino na ang pagkatalo sa laban ay nagpapatingkad sa mga bayani. Sang-ayon ka ba?', options: ['Hindi, dapat laging panalo', 'Oo, ang tunay na lakas ay nagmumula sa pagbangon at pagkatuto sa kabiguan', 'Hindi, ibig sabihin ay mahina ka', 'Oo, para tumigil na'], correct: 1 },
        { question: 'Magandang paraan ba ang paggamit ng kasaysayan sa kuwentong superhero para matuto ang mga bata?', options: ['Hindi, libro lang dapat', 'Oo, pamalit sa eskwelahan', 'Hindi, walang kapa ang bayani noon', 'Oo, ginagawa nitong kapana-panabik ang pag-aaral'], correct: 3 },
        { question: 'Bakit mahalagang huwag sumuko pagkatapos matalo sa isang paligsahan?', options: ['Panalo ang lahat', 'Ang tunay na tagumpay ay nagmumula sa patuloy na pag-iibig sa ginagawa sa kabila ng kabiguan', 'Mali ang hurado', 'Sumali lang kapag siguradong panalo'], correct: 1 },
        { question: 'Tama ba si Marvino na magpatuloy sa pagdidrowing kahit wala siyang totoong laruan?', options: ['Hindi, sayang oras', 'Hindi, bumili na lang', 'Oo, nalinang ng imahinasyon ang kanyang kamangha-manghang talento', 'Oo, kung may bayad'], correct: 2 }
      ]
    }
  },
  {
    id: 'the-little-girl-in-a-box',
    title: 'The Little Girl in a Box',
    titleFil: 'Ang Munting Batang Nasa Kahon',
    cover: coverLittleGirlInABox,
    languageType: 'ENG',
    starred: false,
    pages: {
      ENG: [
        {
          highlight: 'There was once an ordinary cardboard box with no name or stamp, but inside lived a special little girl. ',
          rest: 'She never cried and loved her huge cardboard box where she stayed safe from heat, sun, and rain.'
        },
        {
          highlight: 'As she grew, the box transformed into a boat taking her to a house by the bay, ',
          rest: 'where she played with other children, swam with whale sharks, and listened to mermaids.'
        },
        {
          highlight: 'Later, the box became a car taking her to a fancy house, and then a plane and carabao to a mountain peak village. ',
          rest: 'However, due to strict rules or chilly mountain winds, she always returned to her cozy cardboard box.'
        },
        {
          highlight: 'One day, she woke up in a bright room where a warm family gave her food, play, and love. ',
          rest: 'She came to call them Mama and Papa, realizing her box brought her to the house that became her true home.'
        }
      ],
      FIL: [
        {
          highlight: 'May isang ordinaryong kahon na karton na walang pangalan o tatak, ngunit may nakatirang munting batang babae sa loob. ',
          rest: 'Hindi siya kailanman umiyak at mahal na mahal ang kanyang kahon kung saan ligtas siya sa init at ulan.'
        },
        {
          highlight: 'Habang lumalaki siya, naging bangka ang kahon patungo sa isang bahay sa tabi ng look, ',
          rest: 'kung saan nakipaglaro siya sa ibang mga bata at lumangoy kasama ang mga balyena.'
        },
        {
          highlight: 'Kalaunan, naging kotse ito patungo sa isang magarang bahay, at pagkatapos ay eroplano patungo sa nayon sa tuktok ng bundok. ',
          rest: 'Subalit dahil sa mahihigpit na utos o malamig na hangin, bumabalik siya sa kanyang kahon.'
        },
        {
          highlight: 'Isang araw, nagising siya sa maliwanag na silbar kung saan pinakain at minahal siya ng isang pamilya. ',
          rest: 'Tinawag niya silang Mama at Papa, at nalaman niyang ang kahon ang nagdala sa kanya sa tunay niyang tahanan.'
        }
      ]
    },
    quiz: {
      ENG: [
        { question: 'What did the little girl live in at the beginning of the story?', options: ['A mansion', 'An ordinary cardboard box', 'A house by the bay', 'A mountain hut'], correct: 1 },
        { question: 'What did the nuns do when it was time for bed?', options: ['Gave food', 'Played games', 'Kissed her on the forehead', 'Sang lullabies'], correct: 2 },
        { question: 'Where did the box take the girl when it turned into a boat?', options: ['A house by the bay', 'A school', 'A park', 'A church'], correct: 0 },
        { question: 'What did the man of the house forbid the girl from doing?', options: ['Eating too much', 'Sleeping early', 'Playing and making noise', 'Reading books'], correct: 2 },
        { question: 'Why did the girl keep returning to her cardboard box when unhappy?', options: ['She collected boxes', 'The box was her comfort zone and safe place', 'People forced her', 'She had no other belongings'], correct: 1 },
        { question: 'What does the "box" symbolize in the girl\'s life?', options: ['A stone house', 'A limited world or her safe refuge', 'A simple toy', 'A travel vehicle'], correct: 1 },
        { question: 'Why did the girl feel her experiences in different houses weren\'t nice?', options: ['No toys', 'She did not feel true love and freedom', 'Too far away', 'Couldn\'t get along'], correct: 1 },
        { question: 'Why did the story say the girl finally found her "real home" at the end?', options: ['It was large', 'She felt true love and acceptance from her parents', 'No more box', 'Many toys'], correct: 1 },
        { question: 'What do the transformations of the box represent?', options: ['Limitless imagination even inside a box', 'Magic box', 'Fixing vehicles', 'Traveling desire'], correct: 0 },
        { question: 'What is the most important lesson from this story?', options: ['Stay in boxes', 'A true home is where you find love and acceptance', 'Move often', 'Cardboard boxes are best'], correct: 1 }
      ],
      FIL: [
        { question: 'Ano ang tinitirhan ng batang babae sa simula ng kuwento?', options: ['Mansyon', 'Ordinaryong kahon na karton', 'Bahay sa tabi ng look', 'Kubo sa bundok'], correct: 1 },
        { question: 'Ano ang ginawa ng mga madre tuwing oras ng pagtulog?', options: ['Nagbigay pagkain', 'Naglaro', 'Hinalikan siya sa noo', 'Umawit'], correct: 2 },
        { question: 'Saan dinala ng kahon ang bata nang maging bangka ito?', options: ['Bahay sa tabi ng look', 'Paaralan', 'Parke', 'Simbahan'], correct: 0 },
        { question: 'Ano ang ipinagbawal ng lalaki sa bahay sa bata?', options: ['Kumain ng marami', 'Matulog nang maaga', 'Maglaro at maingay', 'Magbasa'], correct: 2 },
        { question: 'Bakit siya bumabalik sa kahon kapag malungkot?', options: ['Kolektor siya ng kahon', 'Ito ang kanyang kanlungan at ligtas na lugar', 'Pinipilit siya', 'Wala siyang gamit'], correct: 1 },
        { question: 'Ano ang sinisimbolo ng "kahon" sa buhay ng bata?', options: ['Bato na bahay', 'Limitadong mundo o ligtas na kanlungan', 'Laruan', 'Sasakyan'], correct: 1 },
        { question: 'Bakit naramdaman niyang hindi maganda ang karanasan sa ibang bahay?', options: ['Walang laruan', 'Wala siyang naramdamang tunay na pagmamahal at kalayaan', 'Malayo', 'Hindi marunong makisama'], correct: 1 },
        { question: 'Bakit sinabi sa huli na natagpuan na niya ang kanyang "tunay na tahanan"?', options: ['Malaki ito', 'Naramdaman niya ang pagmamahal at pagtanggap ng mga magulang', 'Wala nang kahon', 'Maraming laruan'], correct: 1 },
        { question: 'Ano ang kinakatawan ng pagbabago ng kahon?', options: ['Walang-hanggang imahinasyon kahit nasa loob ng kahon', 'Magic box', 'Mahilig sa sasakyan', 'Gusto maglakbay'], correct: 0 },
        { question: 'Ano ang pinakamahalagang aral mula sa kuwento?', options: ['Tumira sa kahon', 'Ang tunay na tahanan ay kung saan may pagmamahal at pagtanggap', 'Lumipat ng tirahan', 'Maganda ang karton'], correct: 1 }
      ]
    }
  }
];

function BackButton({ onClick }) {
  return (
    <button className="sm-back-btn" onClick={onClick} aria-label="Go back" type="button">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M15 19l-7-7 7-7" stroke="#3F3F3F" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function MicIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="12" rx="3" fill="#FFFFFF" />
      <path d="M5 11a7 7 0 0 0 14 0" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" fill="none" />
      <line x1="12" y1="18" x2="12" y2="22" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="22" x2="16" y2="22" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function KoalaMascot() {
  return (
    <svg width="72" height="72" viewBox="0 0 64 64">
      <circle cx="14" cy="16" r="9" fill="#AEDDE3" />
      <circle cx="50" cy="16" r="9" fill="#AEDDE3" />
      <circle cx="14" cy="16" r="4.5" fill="#F3AFC0" />
      <circle cx="50" cy="16" r="4.5" fill="#F3AFC0" />
      <circle cx="32" cy="30" r="22" fill="#BFE4E8" />
      <circle cx="22" cy="30" r="3" fill="#3F3F3F" />
      <circle cx="42" cy="30" r="3" fill="#3F3F3F" />
      <ellipse cx="32" cy="38" rx="6" ry="4.5" fill="#F3AFC0" />
    </svg>
  );
}

function StoryMode({ onExit }) {
  const [view, setView] = useState('selection'); // 'selection' | 'reading' | 'quiz'
  const [language, setLanguage] = useState('ENG'); // 'ENG' | 'FIL'
  const [activeStory, setActiveStory] = useState(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [progress, setProgress] = useState(35);

  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizDone, setQuizDone] = useState(false);
  const [cardTransition, setCardTransition] = useState('flashcard-active');

  const [carouselOffset, setCarouselOffset] = useState(0);
  const listenTimer = useRef(null);

  const filteredStories = STORIES.filter((s) => s.languageType === language);

  useEffect(() => {
    if (isListening) {
      listenTimer.current = setInterval(() => {
        setProgress((p) => (p >= 100 ? 100 : p + 4));
      }, 350);
    } else {
      clearInterval(listenTimer.current);
    }
    return () => clearInterval(listenTimer.current);
  }, [isListening]);

  const openStory = (story) => {
    setActiveStory(story);
    setPageIndex(0);
    setProgress(35);
    setIsListening(false);
    setView('reading');
  };

  const goNextPage = () => {
    if (!activeStory) return;
    const storyPages = activeStory.pages[language] || activeStory.pages['ENG'];
    
    setIsFlipping(true);
    setTimeout(() => {
      if (pageIndex < storyPages.length - 1) {
        setPageIndex((i) => i + 1);
        setProgress(20);
      } else {
        setQuizIndex(0);
        setSelectedOption(null);
        setQuizDone(false);
        setView('quiz');
        setCardTransition('flashcard-active');
      }
      setIsFlipping(false);
    }, 300);
  };

  const selectQuizOption = (optIndex) => {
    setSelectedOption(optIndex);
  };

  const goNextQuestion = () => {
    if (!activeStory) return;
    const storyQuiz = activeStory.quiz[language] || activeStory.quiz['ENG'];
    
    setCardTransition('flashcard-enter');
    setTimeout(() => {
      if (quizIndex < storyQuiz.length - 1) {
        setQuizIndex((i) => i + 1);
        setSelectedOption(null);
      } else {
        setQuizDone(true);
      }
      setCardTransition('flashcard-active');
    }, 300);
  };

  const backToSelection = () => {
    setView('selection');
    setActiveStory(null);
    setIsListening(false);
  };

  const shiftCarousel = (direction) => {
    const maxOffset = Math.max(0, filteredStories.length - 3);
    setCarouselOffset((prev) => Math.min(maxOffset, Math.max(0, prev + direction)));
  };

  /* Selection View */
  if (view === 'selection') {
    const visibleStories = filteredStories.slice(carouselOffset, carouselOffset + 3);

    return (
      <section className="story-mode sm-selection-bg">
        <div className="sm-header">
          <div className="sm-header-left">
            <BackButton onClick={onExit} />
            <h1 className="sm-title">Story Mode</h1>
          </div>

          <div className="sm-header-center">
            <div className="sm-lang-toggle" role="group" aria-label="Language">
              <button
                type="button"
                className={`sm-lang-option ${language === 'ENG' ? 'is-active' : ''}`}
                onClick={() => { setLanguage('ENG'); setCarouselOffset(0); }}
              >
                ENG
              </button>
              <button
                type="button"
                className={`sm-lang-option ${language === 'FIL' ? 'is-active' : ''}`}
                onClick={() => { setLanguage('FIL'); setCarouselOffset(0); }}
              >
                FIL
              </button>
            </div>
            <span className="sm-choose-label">Choose a story ↓</span>
          </div>

          <div className="sm-header-right" />
        </div>

        <div className="sm-decor-dot sm-decor-dot--red" />
        <div className="sm-decor-dot sm-decor-dot--blue-1" />
        <div className="sm-decor-dot sm-decor-dot--blue-2" />

        <div className="sm-categories">
          <div className="sm-category-block">
            <span className="sm-category-pill">Default Stories ({language})</span>

            <div className="sm-carousel-row">
              <button
                type="button"
                className="sm-carousel-arrow"
                onClick={() => shiftCarousel(-1)}
                disabled={carouselOffset === 0}
                aria-label="Previous stories"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M15 19l-7-7 7-7" stroke="#5B5B5B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <div className="sm-cards-track" key={language}>
                {visibleStories.map((story) => (
                  <button
                    type="button"
                    key={story.id}
                    className="sm-book-card"
                    onClick={() => openStory(story)}
                  >
                    {story.starred && (
                      <span className="sm-star" aria-hidden="true">★</span>
                    )}
                    <img
                      src={story.cover}
                      alt={language === 'FIL' ? story.titleFil : story.title}
                      className="sm-book-cover"
                    />
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="sm-carousel-arrow"
                onClick={() => shiftCarousel(1)}
                disabled={carouselOffset + 3 >= filteredStories.length}
                aria-label="More stories"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M9 5l7 7-7 7" stroke="#5B5B5B" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* Reading View (No Language Toggle here) */
  if (view === 'reading' && activeStory) {
    const storyPages = activeStory.pages[language] || activeStory.pages['ENG'];
    const page = storyPages[pageIndex] || storyPages[0];

    return (
      <section className="story-mode sm-reading-bg">
        <div className="sm-header">
          <div className="sm-header-left">
            <BackButton onClick={backToSelection} />
            <h1 className="sm-title">
              {language === 'FIL' ? activeStory.titleFil : activeStory.title}
            </h1>
          </div>
          <div className="sm-header-center" />
          <div className="sm-header-right" />
        </div>

        <div className="sm-reader-stage">
          <button
            type="button"
            className={`sm-mic-btn ${isListening ? 'is-listening' : ''}`}
            onClick={() => setIsListening((v) => !v)}
            aria-pressed={isListening}
            aria-label="Toggle listening"
          >
            <MicIcon />
          </button>
          <span className="sm-mic-label">
            {isListening ? 'Listening...' : 'Tap to read aloud'}
          </span>

          <div className={`sm-page-card ${isFlipping ? 'flipping' : ''}`}>
            <span className="sm-bookmark" aria-hidden="true" />
            <div className="sm-page-inner">
              <div className="sm-progress-track">
                <div className="sm-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <p className="sm-page-text">
                <span className="sm-highlighted">{page.highlight}</span>
                {page.rest}
              </p>
            </div>
            <span className="sm-page-fold" aria-hidden="true" />
          </div>

          <button
            type="button"
            className="sm-next-page-btn"
            onClick={goNextPage}
            aria-label="Next page"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M9 5l7 7-7 7" stroke="#3F3F3F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <span className="sm-next-page-label">
          {pageIndex < storyPages.length - 1 ? 'Next page' : 'Take the quiz'}
        </span>
      </section>
    );
  }

  /* Quiz View (No Language Toggle here) */
  if (view === 'quiz' && activeStory) {
    const storyQuiz = activeStory.quiz[language] || activeStory.quiz['ENG'];
    const total = storyQuiz.length;

    if (quizDone) {
      return (
        <section className="story-mode sm-reading-bg">
          <div className="sm-header">
            <div className="sm-header-left">
              <BackButton onClick={backToSelection} />
              <h1 className="sm-title">
                {language === 'FIL' ? activeStory.titleFil : activeStory.title}
              </h1>
            </div>
            <div className="sm-header-center" />
            <div className="sm-header-right" />
          </div>
          <div className="sm-quiz-done">
            <KoalaMascot />
            <h2>Great job!</h2>
            <p>You finished all {total} questions.</p>
            <button type="button" className="sm-quiz-done-btn" onClick={backToSelection}>
              Back to Stories
            </button>
          </div>
        </section>
      );
    }

    const q = storyQuiz[quizIndex] || storyQuiz[0];

    return (
      <section className="story-mode sm-reading-bg">
        <div className="sm-header">
          <div className="sm-header-left">
            <BackButton onClick={backToSelection} />
            <h1 className="sm-title">
              {language === 'FIL' ? activeStory.titleFil : activeStory.title}
            </h1>
          </div>
          <div className="sm-header-center" />
          <div className="sm-header-right" />
        </div>

        <div className="sm-quiz-stage">
          <div className="sm-quiz-card-shadow" aria-hidden="true" />
          <div className={`sm-quiz-card ${cardTransition}`}>
            <span className="sm-quiz-number">{quizIndex + 1}</span>
            <span className="sm-quiz-total">/{total}</span>

            <div className="sm-quiz-mascot">
              <KoalaMascot />
            </div>

            <h2 className="sm-quiz-question">{q.question}</h2>

            <div className="sm-quiz-options">
              {q.options.map((opt, i) => (
                <button
                  type="button"
                  key={opt}
                  className={`sm-quiz-option ${selectedOption === i ? 'is-selected' : ''}`}
                  onClick={() => selectQuizOption(i)}
                >
                  {opt}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="sm-quiz-next-btn"
              onClick={goNextQuestion}
              disabled={selectedOption === null}
            >
              {quizIndex < total - 1 ? 'Next question' : 'Finish'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return null;
}

export default StoryMode;
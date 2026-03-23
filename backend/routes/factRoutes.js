const express = require('express');
const router = express.Router();
const axios = require('axios');

// if no wikipedia data, use this
function getHistoricalFactsForDate(month, day) {
    const facts = {
        '01-05': [
            {
                year: 1933,
                title: 'הקמת גשר הזהב בסן פרנסיסקו',
                text: 'ב-5 בינואר 1933 החלה בניית גשר הזהב המפורסם בסן פרנסיסקו, אחד מהגשרים המפורסמים ביותר בעולם. הגשר נפתח לתנועה ב-1937 ונחשב לאחד מפלאי ההנדסה המודרנית.',
                pageUrl: 'https://he.wikipedia.org/wiki/גשר_הזהב',
                thumbnail: null,
                type: 'events'
            },
            {
                year: 1968,
                title: 'מהפכת הסטודנטים בפראג',
                text: 'ב-5 בינואר 1968 החל "האביב של פראג" - תקופה של רפורמות ליברליות בצ\'כוסלובקיה תחת הנהגת אלכסנדר דובצ\'ק. התקופה הסתיימה בפלישה סובייטית באוגוסט של אותה שנה.',
                pageUrl: 'https://he.wikipedia.org/wiki/האביב_של_פראג',
                thumbnail: null,
                type: 'events'
            }
        ],
        '01-06': [
            {
                year: 1912,
                title: 'אלפרד ווגנר מציג את תיאוריית נדידת היבשות',
                text: 'ב-6 בינואר 1912 הציג הגיאולוג הגרמני אלפרד ווגנר את תיאוריית נדידת היבשות, ששינתה את הבנתנו את כדור הארץ. התיאוריה הסבירה כיצד היבשות זזות על פני כדור הארץ.',
                pageUrl: 'https://he.wikipedia.org/wiki/אלפרד_ווגנר',
                thumbnail: null,
                type: 'events'
            }
        ],
        '01-07': [
            {
                year: 1610,
                title: 'גלילאו גליליי מגלה את ירחי צדק',
                text: 'ב-7 בינואר 1610 גילה האסטרונום האיטלקי גלילאו גליליי את ארבעת הירחים הגדולים של צדק: איו, אירופה, גנימד וקליסטו. תגלית זו סייעה להוכיח את המודל ההליוצנטרי של מערכת השמש.',
                pageUrl: 'https://he.wikipedia.org/wiki/גלילאו_גליליי',
                thumbnail: null,
                type: 'events'
            }
        ],
        '01-08': [
            {
                year: 1964,
                title: 'הנשיא לינדון ג\'ונסון מכריז על "מלחמה על העוני"',
                text: 'ב-8 בינואר 1964 הכריז נשיא ארה"ב לינדון ג\'ונסון על "מלחמה על העוני" - תוכנית חברתית מקיפה שנועדה להפחית את העוני בארצות הברית. התוכנית כללה חוקים חשובים כמו Medicare ו-Medicaid.',
                pageUrl: 'https://he.wikipedia.org/wiki/לינדון_ג\'ונסון',
                thumbnail: null,
                type: 'events'
            }
        ],
        '01-09': [
            {
                year: 2007,
                title: 'סטיב ג\'ובס מציג את האייפון הראשון',
                text: 'ב-9 בינואר 2007 הציג סטיב ג\'ובס את האייפון הראשון בכנס Macworld. המכשיר שינה את עולם הטלפונים החכמים והפך לאחד מהמוצרים הטכנולוגיים המשפיעים ביותר בעשור האחרון.',
                pageUrl: 'https://he.wikipedia.org/wiki/אייפון',
                thumbnail: null,
                type: 'events'
            }
        ],
        '01-10': [
            {
                year: 1920,
                title: 'הקמת חבר הלאומים',
                text: 'ב-10 בינואר 1920 נכנס לתוקף חבר הלאומים - הארגון הבינלאומי הראשון שנוסד לשמירת השלום העולמי. הארגון היה הבסיס לאו"ם שנוסד לאחר מלחמת העולם השנייה.',
                pageUrl: 'https://he.wikipedia.org/wiki/חבר_הלאומים',
                thumbnail: null,
                type: 'events'
            }
        ],
        '09-05': [
            {
                year: 1972,
                title: 'טבח הספורטאים במינכן',
                text: 'ב-5 בספטמבר 1972 התרחש טבח הספורטאים במינכן במהלך אולימפיאדת מינכן. 11 ספורטאים ישראלים נהרגו בפיגוע טרור של ארגון "ספטמבר השחור". האירוע שינה את הגישה הבינלאומית לטרור.',
                pageUrl: 'https://he.wikipedia.org/wiki/טבח_הספורטאים_במינכן',
                thumbnail: null,
                type: 'events'
            },
            {
                year: 1698,
                title: 'פיטר הגדול מטיל מס על זקנים',
                text: 'ב-5 בספטמבר 1698 הטיל הצאר הרוסי פיטר הגדול מס מיוחד על גברים שגדלו זקנים, כחלק מרפורמות המודרניזציה שלו. המס נועד לעודד את הרוסים לאמץ את הסגנון האירופי המודרני.',
                pageUrl: 'https://he.wikipedia.org/wiki/פיטר_הגדול',
                thumbnail: null,
                type: 'events'
            },
            {
                year: 1977,
                title: 'שיגור וויאג\'ר 1',
                text: 'ב-5 בספטמבר 1977 שוגרה החללית וויאג\'ר 1 - החללית הראשונה שעזבה את מערכת השמש. החללית נשאה "תקליט זהב" עם צלילים ותמונות מכדור הארץ עבור חייזרים פוטנציאליים.',
                pageUrl: 'https://he.wikipedia.org/wiki/וויאג\'ר_1',
                thumbnail: null,
                type: 'events'
            }
        ],
        '09-06': [
            {
                year: 1522,
                title: 'ספינת ויקטוריה חוזרת מספרד',
                text: 'ב-6 בספטמבר 1522 חזרה ספינת ויקטוריה לספרד לאחר שהשלימה את ההקפה הראשונה בעולם. המסע החל ב-1519 תחת פיקודו של פרדיננד מגלן, והוכיח שכדור הארץ עגול.',
                pageUrl: 'https://he.wikipedia.org/wiki/פרדיננד_מגלן',
                thumbnail: null,
                type: 'events'
            }
        ],
        '09-07': [
            {
                year: 1822,
                title: 'ברזיל מכריזה על עצמאות',
                text: 'ב-7 בספטמבר 1822 הכריזה ברזיל על עצמאותה מפורטוגל. הנסיך פדרו הראשון הפך לקיסר ברזיל הראשון. היום נחגג בברזיל כחג העצמאות הלאומי.',
                pageUrl: 'https://he.wikipedia.org/wiki/עצמאות_ברזיל',
                thumbnail: null,
                type: 'events'
            }
        ]
    };
    
    const key = `${month}-${day}`;
    return facts[key] || [
        {
            year: new Date().getFullYear(),
            title: `היום הוא ${day}/${month} - יום מיוחד בהיסטוריה! ✨`,
            text: `🌟 ביום זה במהלך ההיסטוריה התרחשו אירועים מרתקים ומשמעותיים רבים. כל יום בלוח השנה הוא יום היסטורי חשוב שהשפיע על מהלך ההיסטוריה האנושית! 🏛️`,
            pageUrl: 'https://he.wikipedia.org/wiki/היסטוריה',
            thumbnail: null,
            type: 'fallback'
        }
    ];
}

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Fact routes are working!', timestamp: new Date().toISOString() });
});

// GET /api/fact/today - Get Hebrew Wikipedia "On This Day" fact
router.get('/today', async (req, res) => {
    try {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        
        const wikiUrl = `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/${month}/${day}`;
        
        console.log(`Fetching Wikipedia fact for ${month}/${day}:`, wikiUrl);
        
        const response = await axios.get(wikiUrl, {
            headers: {
                'User-Agent': 'InstagramClone/1.0 (https://localhost:5000; contact@example.com) axios/1.0'
            },
            timeout: 10000
        });
        
        const data = response.data;
        //for DEBUG
        console.log('Wikipedia API response structure:', {
            hasEvents: !!(data.events && data.events.length > 0),
            hasBirths: !!(data.births && data.births.length > 0),
            hasDeaths: !!(data.deaths && data.deaths.length > 0),
            hasHolidays: !!(data.holidays && data.holidays.length > 0),
            eventsCount: data.events ? data.events.length : 0,
            birthsCount: data.births ? data.births.length : 0,
            deathsCount: data.deaths ? data.deaths.length : 0,
            holidaysCount: data.holidays ? data.holidays.length : 0
        });
        
        // Collect all available items and select randomly
        let allItems = [];
        
        if (data.events && data.events.length > 0) {
            allItems = allItems.concat(data.events.map(item => ({ ...item, type: 'events' })));
        }
        if (data.births && data.births.length > 0) {
            allItems = allItems.concat(data.births.map(item => ({ ...item, type: 'births' })));
        }
        if (data.deaths && data.deaths.length > 0) {
            allItems = allItems.concat(data.deaths.map(item => ({ ...item, type: 'deaths' })));
        }
        if (data.holidays && data.holidays.length > 0) {
            allItems = allItems.concat(data.holidays.map(item => ({ ...item, type: 'holidays' })));
        }
        
        // Select a random item from all available facts
        let selectedItem = null;
        let selectedType = '';
        
        if (allItems.length > 0) {
            const randomIndex = Math.floor(Math.random() * allItems.length);
            selectedItem = allItems[randomIndex];
            selectedType = selectedItem.type;
        }
        
        if (!selectedItem) {
            // Fallback: provide interesting historical facts for this date
            const historicalFacts = getHistoricalFactsForDate(month, day);
            const randomFact = historicalFacts[Math.floor(Math.random() * historicalFacts.length)];
            
            console.log('No Wikipedia data found, using historical fact database');
            return res.json(randomFact);
        }
        
        // Extract data from selected item
        const factData = {
            year: selectedItem.year || null,
            title: selectedItem.text || '',
            text: selectedItem.text || '',
            pageUrl: selectedItem.pages && selectedItem.pages.length > 0 
                ? `https://he.wikipedia.org/wiki/${encodeURIComponent(selectedItem.pages[0].titles.normalized)}` 
                : null,
            thumbnail: selectedItem.pages && selectedItem.pages.length > 0 && selectedItem.pages[0].thumbnail
                ? selectedItem.pages[0].thumbnail.source
                : null,
            type: selectedType
        };
        
        console.log('Selected fact:', {
            type: selectedType,
            year: factData.year,
            title: factData.title.substring(0, 100) + '...',
            hasPageUrl: !!factData.pageUrl,
            hasThumbnail: !!factData.thumbnail
        });
        
        res.json(factData);
        
    } catch (error) {
        console.error('Error fetching Wikipedia fact:', error.message);
        
        // If Wikipedia API fails, use our historical facts database
        console.log('Wikipedia API failed, falling back to historical facts database');
        const historicalFacts = getHistoricalFactsForDate(month, day);
        const randomFact = historicalFacts[Math.floor(Math.random() * historicalFacts.length)];
        
        return res.json(randomFact);
    }
});

module.exports = router;

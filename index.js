const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');
const cheerio = require('cheerio');

// Bodyparser middleware
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
app.use(bodyParser.json());

const makeArrUnique = (originalArr) => {
  const uniqueSet = new Set(originalArr);
  const modifiedArr= [...uniqueSet];
  return modifiedArr; 
}

const possibleUrls = url => {
  return new Promise(
    (resolve, reject) => {
        request(url, (error, response, html) => {

            if (error || response.statusCode != 200)
              reject(error);

            let serverName = '';
            if (response)
              serverName = response.connection.servername.replace("www", "");

            if (!html || !response)
              return;
            const $ = cheerio.load(html);
            const links = $('a');
            const allLinksFull = []; 

            for (let i = 0; i < $('a').length; i++) {
              const currentLink1 = decodeURIComponent(links.eq(i).prop('href'));
              const currentLink = encodeURI(currentLink1);

              if (links.eq(i).prop('href')) {
                if (!links.eq(i).prop('href').includes("http") || !links.eq(i).prop('href').includes("www")) {
                  if (links.eq(i).prop('href').includes(serverName))
                    if (!links.eq(i).prop('href').includes('http'))
                      allLinksFull.push('http://' + currentLink);
                    else 
                      allLinksFull.push(currentLink);
                  else if (!links.eq(i).prop('href').includes("http") && !links.eq(i).prop('href').includes("www"))
                    allLinksFull.push('http://' + serverName + currentLink);
                } else if (links.eq(i).prop('href').includes(serverName)) {
                  allLinksFull.push('http://' + currentLink);
                }            
              }
            }
     
            resolve(makeArrUnique(allLinksFull)); 
        });
    }
  );
}

const calculateUrlsWithClicks = async (url, clicks, urlParserFunc) => {
  let possibleRedirectFromLinks = [url];
  let possibleRedirectLinks = [];

  for (let i = 0; i < clicks; i++) {
    for (let k = 0; k < possibleRedirectFromLinks.length; k++) {
      try {
        const urlResults = await urlParserFunc(possibleRedirectFromLinks[k]);
        const finalUrlResults = makeArrUnique(urlResults);
        console.log("NUMBER OF LINKS FROM " + possibleRedirectFromLinks[k] + " - " + finalUrlResults.length);
        possibleRedirectLinks = possibleRedirectLinks.concat(finalUrlResults);
      } catch(e) {
        console.log('Error caught - ' + e);
      }
    }
    possibleRedirectFromLinks = [...possibleRedirectLinks];
    possibleRedirectLinks = [];
  }
  
  return makeArrUnique(possibleRedirectFromLinks);
}

app.post('/wikipedia', async (req, res) => {
  
    const reqLinksArray = req.body.urls;
    let possibleLinksArray = [];

    if (reqLinksArray && req.body.clicks) {
      for (let i = 0; i < reqLinksArray.length; i++) {
        urlsForSingleLink = await calculateUrlsWithClicks(reqLinksArray[i],
          req.body.clicks, possibleUrls);
        possibleLinksArray = [...possibleLinksArray, ...urlsForSingleLink];
      }

      possibleLinksArray = makeArrUnique(possibleLinksArray);
    }

    res.status(400).json(possibleLinksArray);
});

app.listen(8000, () => {
  console.log('Wikipedia app listening on port 8000!');
});
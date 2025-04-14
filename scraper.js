import puppeteer from 'puppeteer';
import fs from 'fs';

async function scrapeYokAtlas() {
  // Launch the browser
  const browser = await puppeteer.launch({
    headless: true, // Set to false to see the browser while processing
    defaultViewport: null,
    args: ['--start-maximized'],
  });

  const tumSonuclar = [];
  const links = [
    {
      url: 'https://yokatlas.yok.gov.tr/tercih-sihirbazi-t4-tablo.php?p=say',
      category: 'say',
    },
    {
      url: 'https://yokatlas.yok.gov.tr/tercih-sihirbazi-t4-tablo.php?p=s%C3%B6z',
      category: 'soz',
    },
    {
      url: 'https://yokatlas.yok.gov.tr/tercih-sihirbazi-t4-tablo.php?p=ea',
      category: 'ea',
    },
    {
      url: 'https://yokatlas.yok.gov.tr/tercih-sihirbazi-t4-tablo.php?p=dil',
      category: 'dil',
    },
  ];

  try {
    // Open a new page
    const page = await browser.newPage();

    // Rate limiting measure - Use random User-Agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36'
    );

    for (const linkData of links) {
      console.log(`Fetching data for ${linkData.category} category...`);
      let sayfaNo = 1;

      // Go to the first page
      await page.goto(linkData.url, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Main loop - traverse all pages
      let devamEt = true;

      while (devamEt) {
        console.log(`Processing page ${sayfaNo}...`);

        // Wait for the page to load
        await page.waitForSelector('table.table-bordered', { timeout: 30000 });

        // Find the target header text
        const hedefBaslik = 'TBS (0.12) 2024 2023 2022 2021';
        let hedefKolonIndex = await page.evaluate((hedefBaslik) => {
          const tableHeaders = document.querySelectorAll(
            'table.table-bordered thead th'
          );
          for (let i = 0; i < tableHeaders.length; i++) {
            if (
              tableHeaders[i].textContent.trim() === hedefBaslik ||
              (tableHeaders[i].textContent.includes('TBS') &&
                tableHeaders[i].textContent.includes('2024'))
            ) {
              return i;
            }
          }
          return -1;
        }, hedefBaslik);

        if (hedefKolonIndex === -1) {
          console.error('Target column not found!');
          break;
        }

        // Loop through table rows
        const rows = await page.$$('#mydata tbody tr');
        console.log(`Total ${rows.length} rows found.`);

        const sayfaSonuclari = [];

        for (let i = 0; i < rows.length; i++) {
          try {
            // Get Program ID - Fixed version
            const programID = await page.evaluate((rowIndex) => {
              const cell = document.querySelector(
                `#mydata tbody tr:nth-child(${rowIndex + 1}) td:nth-child(2)`
              );
              if (!cell) return null;

              // If the cell contains an element with "Eski Kılavuz Kodu"
              if (cell.innerHTML.includes('Eski Kılavuz Kodu')) {
                // Get the first text node
                for (let i = 0; i < cell.childNodes.length; i++) {
                  if (
                    cell.childNodes[i].nodeType === Node.TEXT_NODE &&
                    cell.childNodes[i].textContent.trim() !== ''
                  ) {
                    return cell.childNodes[i].textContent.trim();
                  }
                }
              }

              // Normal case - first link element
              const link = cell.querySelector('a:first-child');
              return link ? link.textContent.trim() : null;
            }, i);

            if (!programID) {
              continue;
            }

            // Get program name with given XPath
            const programAdi = await page.evaluate((rowIndex) => {
              try {
                const element = document.evaluate(
                  `/html/body/div[2]/div[2]/div[2]/div/div/div[2]/div/table/tbody/tr[${
                    rowIndex + 1
                  }]/td[4]/strong`,
                  document,
                  null,
                  XPathResult.FIRST_ORDERED_NODE_TYPE,
                  null
                ).singleNodeValue;

                return element ? element.textContent.trim() : null;
              } catch (e) {
                return null;
              }
            }, i);

            // Get description field
            const description = await page.evaluate((rowIndex) => {
              try {
                const element = document.evaluate(
                  `/html/body/div[2]/div[2]/div[2]/div/div/div[2]/div/table/tbody/tr[${
                    rowIndex + 1
                  }]/td[4]/font`,
                  document,
                  null,
                  XPathResult.FIRST_ORDERED_NODE_TYPE,
                  null
                ).singleNodeValue;

                return element ? element.textContent.trim() : null;
              } catch (e) {
                return null;
              }
            }, i);

            // Get university name
            const uniAdi = await rows[i]
              .$eval('td:nth-child(3) strong', (el) => el.textContent.trim())
              .catch(() => 'Unknown University');

            // Get department name
            const bolumAdi = await rows[i]
              .$eval('td:nth-child(3) font', (el) => el.textContent.trim())
              .catch(() => 'Unknown Department');

            // Find the red value (in the specified column index)
            const siralamaTxt = await rows[i]
              .$eval(
                `td:nth-child(${hedefKolonIndex + 1}) font[color="red"]`,
                (el) => el.textContent.trim()
              )
              .catch(() => null); // Returns null if no red value exists

            // Get the score value from the given xpath
            const puanTxt = await page.evaluate((rowIndex) => {
              try {
                const element = document.evaluate(
                  `/html/body/div[2]/div[2]/div[2]/div/div/div[2]/div/table/tbody/tr[${
                    rowIndex + 1
                  }]/td[13]/font[1]`,
                  document,
                  null,
                  XPathResult.FIRST_ORDERED_NODE_TYPE,
                  null
                ).singleNodeValue;

                return element ? element.textContent.trim() : null;
              } catch (e) {
                return null;
              }
            }, i);

            // Process "Dolmadı" value and convert numerical values to Number type
            let siralama = null;
            if (siralamaTxt && siralamaTxt !== 'Dolmadı') {
              // Remove thousand separator dots completely, convert comma to dot
              siralama = parseInt(
                siralamaTxt.replace(/\./g, '').replace(',', '.')
              );
            }

            let puan = null;
            if (puanTxt && puanTxt !== 'Dolmadı') {
              puan = Number(puanTxt.replace(',', '.'));
            }

            // Add the data
            sayfaSonuclari.push({
              id: programID,
              university: uniAdi,
              department: bolumAdi,
              program: programAdi,
              description: description,
              rank: siralama,
              score: puan,
              category: linkData.category,
            });
          } catch (error) {
            console.error(`Error processing row:`, error.message);
          }
        }

        // Add page results to total results
        tumSonuclar.push(...sayfaSonuclari);
        console.log(
          `Page ${sayfaNo}: ${sayfaSonuclari.length} results added. Total: ${tumSonuclar.length}`
        );

        // Save intermediate results
        fs.writeFileSync(
          'yok_atlas_all_results.json',
          JSON.stringify(tumSonuclar, null, 2),
          'utf8'
        );

        // Check if the next page button is active
        const nextButtonDisabled = await page.evaluate(() => {
          const nextButton = document.querySelector('#mydata_next');
          return nextButton ? nextButton.classList.contains('disabled') : true;
        });

        if (nextButtonDisabled) {
          console.log('Reached the last page. Moving to the next category...');
          devamEt = false;
        } else {
          // Go to the next page
          console.log('Moving to the next page...');

          // Close any modals or popups that might have appeared from previous clicks
          await page.evaluate(() => {
            const modals = document.querySelectorAll('.modal');
            modals.forEach((modal) => {
              if (modal && modal.style.display !== 'none') {
                modal.style.display = 'none';
              }
            });
          });

          // Click on the next page button
          await Promise.all([
            page.click('#mydata_next a'),
            page
              .waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 })
              .catch(() => {
                console.log('Page navigation not completed, continuing...');
              }),
          ]);

          // Random delay of 1-3 seconds for rate limiting
          const gecisGecikmesi = Math.floor(Math.random() * 2000) + 1000;
          console.log(
            `Waiting ${gecisGecikmesi / 1000} seconds for page transition...`
          );

          // Using page.evaluate + setTimeout instead of page.waitForTimeout
          await page.evaluate((gecisGecikmesi) => {
            return new Promise((resolve) =>
              setTimeout(resolve, gecisGecikmesi)
            );
          }, gecisGecikmesi);

          sayfaNo++;
        }
      }
    }

    // Show all results
    console.log(
      `Process completed. Total ${tumSonuclar.length} results found.`
    );
    console.log('All data has been saved to "yok_atlas_all_results.json".');

    return tumSonuclar;
  } catch (error) {
    console.error('Error while fetching data:', error);

    // Save available data in case of error
    if (tumSonuclar.length > 0) {
      fs.writeFileSync(
        'yok_atlas_error.json',
        JSON.stringify(tumSonuclar, null, 2),
        'utf8'
      );
      console.log(
        'Error occurred! Available data has been saved to "yok_atlas_error.json".'
      );
    }
  } finally {
    // Close the browser
    await browser.close();
  }
}

// Run the function
await scrapeYokAtlas();

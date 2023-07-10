const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const csv = require('csv-writer');

const PORT = 8000;
const current_year = new Date().getFullYear();
const services = [
    'netflix', 
    'hbo_max', 
    'canal_plus_manual', 
    'disney'
]

const app = express();

const servicePromises = services.map(service => {
  return axios(`https://www.filmweb.pl/ranking/vod/${service}/film/${current_year}`)
    .then(response => {
        const html = response.data;
        const $ = cheerio.load(html);
        const movies = [];
        $('.rankingType__card').each(function() {
                const title = $(this).find('.rankingType__title').text();
                const platform = service;
                const rating = $(this).find('.rankingType__rate--value').text();
                movies.push({title, platform, rating});
        });
        return movies;
    });
});

Promise.all(servicePromises)
  .then(allMovies => {
    //create one list from all promnises
    let listOfMovies = [].concat(...allMovies); //flat

    //Remove duplicates which have lower rating
    listOfMovies = listOfMovies.reduce((acc, current) => {
        const x = acc.find(item => item.title === current.title);
        if (!x) {
            return acc.concat([current]);
        } else {
            return acc.map(item => (item.title === current.title && item.rating < current.rating) ? current : item);
        }
        }, []);
    
    //Order movies by rating
    listOfMovies.sort((a, b) => (a.rating < b.rating) ? 1 : -1);
    
    //Save movies to csv files
    const csvWriter = csv.createObjectCsvWriter({
        path: 'movies.csv',
        header: [
            {id: 'title', title: 'Title'},
            {id: 'platform', title: 'VOD service name'},
            {id: 'rating', title: 'rating'}
        ]
    });
    csvWriter.writeRecords(listOfMovies)
        .then(() => console.log('The CSV file was written successfully'));
    })
  .catch(err => console.log(err));


app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`));
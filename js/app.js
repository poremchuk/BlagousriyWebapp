'use strict';

// Class for JSON data exchange via AJAX
//
class JSONRequester {
	constructor() {
		this.XHR = ("onload" in new XMLHttpRequest()) ? XMLHttpRequest : XDomainRequest;
	}

	// GET method
	// @param url 			(string) 		- destination URL
	// @param callback 	(function) 	- function to which response data and errors will be returned
	//
	get(url, callback) {
    const xhr = new this.XHR();
		xhr.open('GET', url, true);
		xhr.send();
		xhr.onreadystatechange = () => {
		  if (xhr.readyState !== 4) return;
		  if (xhr.status !== 200) {
				callback(new Error(xhr.status + ': ' + xhr.statusText));
		  } else {
		    callback(null, JSON.parse(xhr.responseText));
		  }
			xhr.abort();
		};
	}

	// POST method
	// @param url 			(string) 						- destination URL
	// @param data			(string or object)	- data to be sent in POST body
	// @param callback 	(function) 					- function to which response data and errors will be returned
	//
	post(url, data, callback) {
    const xhr = new this.XHR();
    xhr.open('POST', url, true);
		xhr.send(typeof data === 'string' ? data : JSON.stringify(data));
		xhr.onreadystatechange = () => {
		  if (xhr.readyState !== 4) return;
		  if (xhr.status !== 200) {
				callback(new Error(xhr.status + ': ' + xhr.statusText));
		  } else {
		    callback(null, JSON.parse(xhr.responseText));
		  }
			xhr.abort();
		};
	}
};

// Application Class
// All website's logic contented here
//
class Application {
  constructor() {

		// JSON processor
    this.requster = new JSONRequester();

		// Month number to name converter
		const MONTH = {
      0: 'Січня',
      1: 'Лютого',
      2: 'Березня',
      3: 'Квітня',
      4: 'Травня',
      5: 'Червня',
      6: 'Липня',
      7: 'Серпня',
      8: 'Вересня',
      9: 'Жовтня',
      10: 'Листопада',
      11: 'Грудня'
    };

		// Adding map to the page
    this.map = L.map('map', { scrollWheelZoom: false }).setView([49, 33], 6);
		L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>' }).addTo(this.map);
		this.map.on('focus', () => this.map.scrollWheelZoom.enable());
		this.map.on('blur', () => this.map.scrollWheelZoom.disable());

		// Retriving defects from API
		// TODO: process errors
    this.requster.get('http://drohobych.ml/api/v1/documents/?workflow_type=defekt', (err, data) => {
      if (err) return alert(err);
      const defects = document.querySelector('#defects');
			// displays last 4 defects
      data.sort((a, b) => new Date(b['date_created']) - new Date(a['date_created'])).slice(0, 4).map((defect) => {
				// date transformation to user-friendly
				const date = new Date(defect['date_created']);
				// adding defect card to the page
        defects.insertAdjacentHTML('beforeend', `
					<div class="col-xs-12 col-sm-3">
						<div class="card">
							<img class="img-responsive" src="${defect['title_image']}">
							<div class="card-meta">
								<span class="date">${date.getDate()} ${MONTH[date.getMonth()]}, ${date.getFullYear()}</span>
								<span class="tags"><a href="#">${defect['created_by_name']}</a></span>
							</div>
							<div class="card-content">
								<h5><a href="#${defect.id}">${defect.title}</a></h5>
								<p>${defect['state_field_name']}</p>
								<a href="#${defect.id}" class="more">Детальніше</a>
							</div>
						</div>
					</div>
        `);
      });

			// adding defect to the map
			// TODO: process errors
			data.map((defect) => {
				this.requster.get(`http://drohobych.ml/api/v1/formcomponentvalue/document/${defect.id}`, (err, components) => {
					if (err) return alert(err);
					components
						.filter((e) => e['form_component_name'] === 'Map')
						.map((e) => {
							L.marker([e.value.lat, e.value.lng], { title: defect.title }).addTo(this.map);
						});
				});
			});
    });
  }

	getURLhashParam(url) {
		const parsedURL = url || new URL(window.location.href);
	}
}

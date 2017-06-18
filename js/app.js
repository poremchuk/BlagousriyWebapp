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

// Single Page behaviour class
//
class SiteMenu {
	constructor(triggers) {
		this.sections = [];
		this.top = document.getElementById('page-top');
		triggers.map((e) => {
			if (e.section) this.sections.push(e.section);
			// multiple triggers may trigger section/modal opening
			// and data updating
			Array.from(e.trigger).map((t) => {
				t.addEventListener('click', (event) => {
					event.preventDefault();
					if (e.updater) e.updater();
					if (e.section) this.sections.map((s) => s.style.display = 'none');
					if (e.section) e.section.style.display = 'block';
					window.scrollTo(0, 0);
				}, false);
			});
		});
		// displaying first section
		this.sections.map((s) => s.style.display = 'none');
		this.sections[0].style.display = 'block';
		window.scrollTo(0, 0);
	}
};

// Application Class
// Almost all website's logic contented here
//
class Application {
  constructor(menu) {
		// Site Menu
		this.menu = menu;
		// Map
		this.map = L.map('map', { scrollWheelZoom: false }).setView([49, 33], 6);
		L.tileLayer('http://korona.geog.uni-heidelberg.de/tiles/roads/x={x}&y={y}&z={z}', { attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>' }).addTo(this.map);
		this.map.markers = new L.FeatureGroup();
		this.map.on('focus', () => this.map.scrollWheelZoom.enable());
		this.map.on('blur', () => this.map.scrollWheelZoom.disable());
		// JSON processor
    this.requster = new JSONRequester();
		// Month number to name converter
		this.MONTH = {
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

		this.clearMapMarkers();
		this.updateDefects();
  }

	clearMapMarkers() {
		this.map.removeLayer(this.map.markers);
		this.map.markers = new L.FeatureGroup();
	}

	updateDefects() {
		// Retriving defects from API
		// TODO: process errors
		this.requster.get('http://drohobych.ml/api/v1/documents/?workflow_type=defekt', (err, data) => {
			if (err) return alert(err);
			/*************************************************************
			 * Displaying recent 8 defects on main subpage
			 *************************************************************/
			const defects = document.querySelector('#defects');
			defects.innerHTML = '';
			data.sort((a, b) => new Date(b['date_created']) - new Date(a['date_created'])).slice(0, 8).map((defect) => {
				// date transformation to user-friendly
				const date = new Date(defect['date_created']);
				// adding defect card to the page
				defects.insertAdjacentHTML('beforeend', `
					<div class="col-xs-12 col-sm-3">
						<div class="card">
							<img class="img-responsive" src="${defect['title_image']}">
							<div class="card-meta">
								<span>${date.getDate()} ${this.MONTH[date.getMonth()]}, ${date.getFullYear()}</span>
								<span><a href="#">${defect['created_by_name']}</a></span>
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

			// TODO: process errors
			const allDefects = document.querySelector('#allDefects');
			const eStatus = document.getElementById('search-status');
			allDefects.innerHTML = '';
			eStatus.innerHTML = '';
			eStatus.insertAdjacentHTML('beforeend', `<option disabled selected>Статус виконання</option>`);
			this.clearMapMarkers();
			data.map((defect) => {
				this.requster.get(`http://drohobych.ml/api/v1/formcomponentvalue/document/${defect.id}`, (err, components) => {
					if (err) return alert(err);
					/*************************************************************
					 * Adding defects whereabouts to the map
					 *************************************************************/
					components
						.filter((e) => e['form_component_name'] === 'Map')
						.map((e) => {
							const marker = L.marker([e.value.lat, e.value.lng], { title: defect.title });
							this.map.markers.addLayer(marker);
						});
				});
				/*************************************************************
				 * Displaying all defects on defects database subpage
				 *************************************************************/
				eStatus.insertAdjacentHTML('beforeend', `<option>${defect['state_field_name']}</option>`);
				const date = new Date(defect['date_created']);
				allDefects.insertAdjacentHTML('beforeend', `
					<div class="col-xs-12 col-sm-3">
						<div class="card">
							<img class="img-responsive" src="${defect['title_image']}">
							<div class="card-meta">
								<span>${date.getDate()} ${this.MONTH[date.getMonth()]}, ${date.getFullYear()}</span>
								<span><a href="#">${defect['created_by_name']}</a></span>
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
			this.map.addLayer(this.map.markers);
		});
	}

	searchDefectsAndUpdate({ region, status, date }) {
		// data unification
		region = region.trim().toLowerCase();
		region = region !== 'область' ? region : '';
		status = status.trim().toLowerCase();
		status = status !== 'статус виконання' ? status : '';
		date 	 = date ? new Date(date.trim().toLowerCase()).toDateString() : '';
		const allDefects = document.getElementById('allDefects');
		allDefects.innerHTML = '';
		// data upload from API
		this.requster.get(`http://drohobych.ml/api/v1/formcomponentvalue/`, (err, defectsDetails) => {
			this.requster.get('http://drohobych.ml/api/v1/documents/?workflow_type=defekt', (err, defects) => {
				defects.map((defect) => {
					const defectDate = new Date(defect['date_created']);
					if (date !== '' && defectDate.toDateString() !== date) return;
					if (status !== '' && defect['state_field_name'].toLowerCase() !== status) return;
					let position = defectsDetails.filter((component) => component['form_component_name'] === 'Map' && component.document === defect.id);
					if (position.length > 0) {
						position = position[0].value;
					} else return;
					this.requster.get(
						`http://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}&zoom=18&accept-language=uk`,
						(err, defectAddress) => {
							if (region !== '' && defectAddress.address.state && defectAddress.address.state.toLowerCase() !== region) return;
							else if (region !== '' && defectAddress.address.city && 'м. ' + defectAddress.address.city.toLowerCase() !== region) return;
							allDefects.insertAdjacentHTML('beforeend', `
								<div class="col-xs-12 col-sm-3">
									<div class="card">
										<img class="img-responsive" src="${defect['title_image']}">
										<div class="card-meta">
											<span>${defectDate.getDate()} ${this.MONTH[defectDate.getMonth()]}, ${defectDate.getFullYear()}</span>
											<span><a href="#">${defect['created_by_name']}</a></span>
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
				});
			});
		});
	}
}

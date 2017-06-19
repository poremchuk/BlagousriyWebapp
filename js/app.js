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
		this.sections.push(document.querySelector('.single-defect-section'));
		// displaying first section
		this.sections.map((s) => s.style.display = 'none');
		this.sections[0].style.display = 'block';
		window.scrollTo(0, 0);
	}

	showSingleCard() {
		this.sections.map((s) => s.style.display = 'none');
		const section = document.querySelector('.single-defect-section');
		section.style.display = 'block';
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
		this.map.invalidateSize(false);
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
			this.requster.get(`http://rozumnemisto.ml/api/v1/builder/2/type/defekt`, (err, statuses) => {
				statuses.map((s) => eStatus.insertAdjacentHTML('beforeend', `<option value="${s.slug}">${s.label}</option>`));
			});
			data.map((defect, i) => {
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
				if (i === data.length - 1) this.addMoreListeners();
			});
			this.map.addLayer(this.map.markers);
		});
	}

	addMoreListeners() {
		const singleDefectSubpageFiller = ({ title, creationDate, image, description, creator, address, modificationDate, statuses }) => {
			document.querySelector('.single-defect-section').innerHTML = '';
			document.querySelector('.single-defect-section').insertAdjacentHTML('beforeend', `
				<div class="container">
					<div class="row">
						<div class="col-lg-12">
							<h1 class="page-header">${title || ''} <small>${creationDate.getDate() || ''} ${this.MONTH[creationDate.getMonth()] || ''}, ${creationDate.getFullYear() || ''}</small></h1>
						</div>
					</div><!-- /.row -->

					<div class="row">
						<div class="col-md-8">
							<img class="img-responsive" src="${image || 'http://placehold.it/750x500'}">
						</div>
						<div class="col-md-4">
							<div id="map-single-defect" style="width: 100% !important; height: 30vh;"></div>
							<h3>Опис заявки</h3>
							<p>${description || ''}</p>
							<h3>Деталі заявки</h3>
							<ul>
								<li>Додав: ${creator || ''}</li>
								<li>Адреса: ${address || ''}</li>
								<li>Додана: ${creationDate.toLocaleString() || ''}</li>
								<li>Модифікована: ${modificationDate.toLocaleString() || ''}</li>
							</ul>
						</div>
					</div><!-- /.row -->

					${
						statuses.length > 0 ? `
						<div class="row">
							<div class="col-lg-12">
								<h3 class="page-header">Зміна статусів</h3>
							</div>
							<div class="col-lg-12">
								<table class="table table-striped">
									<thead>
										<tr>
											<th>З</th>
											<th>На</th>
											<th>Змінено</th>
										</tr>
									</thead>
									<tbody>
										${
											statuses.reduce((result, { from, to, date }) => (
												result + `
												<tr>
													<th scope="row">${from || ''}</th>
													<td>${to || ''}</td>
													<td>${date.toLocaleString() || ''}</td>
												</tr>
												`
											), '')
										}
									</tbody>
								</table>
							</div>
						</div><!-- /.row -->
						` : ''
					}
				</div><!-- /.container -->
			`);
		};

		const handler = (event) => {
			event.preventDefault();
			this.menu.showSingleCard();
			const id = event.target.href.slice(event.target.href.indexOf('#') + 1) - '0';
			this.requster.get(`http://drohobych.ml/api/v1/documents/${id}`, (err, data) => {
				if (err) return alert(err);
				this.requster.get(`http://drohobych.ml/api/v1/formcomponentvalue/document/${id}`, (err, details) => {
					if (err) return alert(err);
					let position = details.filter((d) => d['form_component_name'] === 'Map');
					const description = details.filter((d) => d['form_component_name'] === 'Детальний опис проблеми')[0] || {};
					this.requster.get(`http://rozumnemisto.ml/api/v1/proceeding/completed/${id}`, (err, statuses) => {
						const sortedStatuses = statuses.sort((a, b) => a.id - b.id);
						const statusesArray = sortedStatuses.map((s) => {
							const transitionParts = s.transition.split(' -> ');
							return { from: transitionParts[0], to: transitionParts[1], date: new Date(s['transaction_date']) };
						});
						if (position.length > 0) {
							position = position[0].value;
							this.requster.get(`http://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}&zoom=18&accept-language=uk`, (err, defectAddress) => {
								if (err) return alert(err);
								singleDefectSubpageFiller({
									title: data.title,
									creationDate: new Date(data['date_created']),
									image: data['title_image'],
									description: description.value,
									creator: data['created_by_name'],
									address: defectAddress['display_name'],
									modificationDate: new Date(data['date_updated']),
									statuses: statusesArray
								});
								const singleDefectMap = L.map('map-single-defect', { scrollWheelZoom: false }).setView([position.lat, position.lng], 15);
								L.tileLayer('http://korona.geog.uni-heidelberg.de/tiles/roads/x={x}&y={y}&z={z}', { attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a>' }).addTo(singleDefectMap);
								singleDefectMap.on('focus', () => singleDefectMap.scrollWheelZoom.enable());
								singleDefectMap.on('blur', () => singleDefectMap.scrollWheelZoom.disable());
								L.marker([position.lat, position.lng]).addTo(singleDefectMap);
							});
						} else {
							singleDefectSubpageFiller({
								title: data.title,
								creationDate: new Date(data['date_created']),
								image: data['title_image'],
								description: description.value,
								creator: data['created_by_name'],
								modificationDate: new Date(data['date_updated']),
								statuses: statusesArray
							});
						}
					});
				});
			});
		};

		// adding handler for single-defect-subpage load
		Array.from(document.querySelectorAll('.more')).map((e) => {
			e.removeEventListener('click', handler);
			e.addEventListener('click', handler, false);
		});
	}

	searchDefectsAndUpdate({ region, status }) {
		// data unification
		region = region.trim().toLowerCase();
		region = region !== 'область' ? region : '';
		status = status.trim().toLowerCase();
		status = status !== 'статус виконання' ? status : '';

		const allDefects = document.getElementById('allDefects');
		allDefects.innerHTML = '';
		let foundResults = false;

		const allDefectsFiller = (defect) => {
			const defectDate = new Date(defect['date_created']);
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
		};

		this.requster.get(`http://drohobych.ml/api/v1/documents/?workflow_type=defekt${status !== '' ? `&state=${status}` : ''}`, (err, results) => {
			if (results.length === 0) return allDefects.innerHTML = '<p class="lead">Результатів не знайдено.</p>';
			results.map((defect, i) => {
				if (region !== '') {
					this.requster.get(`http://drohobych.ml/api/v1/formcomponentvalue/document/${defect.id}`, (err, defectComponents) => {
						let position = defectComponents.filter((component) => component['form_component_name'] === 'Map');
						if (position.length > 0) {
							position = position[0].value;
						} else return;
						this.requster.get(
							`http://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}&zoom=18&accept-language=uk`,
							(err, defectAddress) => {
								if (
									(defectAddress.address.state && defectAddress.address.state.toLowerCase() === region) ||
									(defectAddress.address.city && 'м. ' + defectAddress.address.city.toLowerCase() === region)
								) {
									allDefectsFiller(defect);
									foundResults = true;
								}
								if (i === results.length - 1) {
									if (!foundResults) allDefects.innerHTML = '<p class="lead">Результатів не знайдено.</p>';
									this.addMoreListeners();
								}
							});
					});
				} else {
					allDefectsFiller(defect);
					foundResults = true;
					if (i === results.length - 1) {
						if (!foundResults) allDefects.innerHTML = '<p class="lead">Результатів не знайдено.</p>';
						this.addMoreListeners();
					}
				}
			});
		});
	}
}

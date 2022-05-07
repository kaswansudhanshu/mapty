'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, dist, duration) {
    this.coords = coords; //[lat,lng]
    this.dist = dist; // in Km
    this.duration = duration; // in min
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, dist, duration, cadence) {
    super(coords, dist, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.dist;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, dist, duration, elevationGain) {
    super(coords, dist, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.dist / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const edit = document.querySelector('.edit_btn');
const deleteAll = document.querySelector('.deleteAll_btn');
const sortbtn = document.querySelector('.sort_btn');

const confirmDeleteOne = document.querySelector('.confirm_one');
const confirmDeleteAll = document.querySelector('.confirm_all');
const overlay = document.querySelector('.overlay');
const confirmYesOne = document.querySelector('.confirm_yes_one');
const confirmYesAll = document.querySelector('.confirm_yes_all');
const confirmNo = document.querySelectorAll('.confirm_no');

class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  #editEvents;

  constructor() {
    //Getting Position
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    //confirmations

    //Add EventListeners
    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggelElevationEvent);

    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    deleteAll.addEventListener('click', this._deleteWorkoutAll.bind(this));

    document.addEventListener('keydown', this._hideConfirmOverlay.bind(this));

    this._confirmations();
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Sorry! Could not get Your Location');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    //Handling Click Event
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //Clear Fields
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';
    //hide form
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggelElevationEvent() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    //if Workout is running, define Cadence
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //Check validity of inputs
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be Positive numbers');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    //If Workout is Cycling, define elevation
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be Positive numbers');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add new object to workout array
    this.#workouts.push(workout);

    //Render workout marker on map
    this._renderWorkoutMarker(workout);

    //render workout on list
    this._renderWorkout(workout);

    //hide form and Clear Fields
    this._hideForm();

    //set Local storage to all workouts
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon"> ${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♂️'
            }</span>
            <span class="workout__value">5.2</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;

    if (workout.type === 'running')
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        
    `;
    if (workout.type === 'cycling')
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
          </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
        
    `;

    html += `<form class="edit_form hidden" data-id="${workout.id}">
          <div class="form__row">
            <label class="form__label">Type</label>
            <select class="form__input form__input--type">
              <option value="running">Running</option>
              <option value="cycling">Cycling</option>
            </select>
          </div>
          <div class="form__row">
            <label class="form__label">Distance</label>
            <input class="form__input form__input--distance" placeholder="km" />
          </div>
          <div class="form__row">
            <label class="form__label">Duration</label>
            <input
              class="form__input form__input--duration"
              placeholder="min"
            />
          </div>
          <div class="form__row">
            <label class="form__label">Cadence</label>
            <input
              class="form__input form__input--cadence"
              placeholder="step/min"
            />
          </div>
          <div class="form__row form__row--hidden">
            <label class="form__label">Elev Gain</label>
            <input
              class="form__input form__input--elevation"
              placeholder="meters"
            />
          </div>
          <button class="form__btn submit_btn hidden" type="submit">
            Submit
          </button>
        </form>
    <button class="form__btn edit_workout  hide_btn" data-id="${workout.id}" type="button">
      Edit <i class="fas fa-pencil-alt"></i>
    </button>
    <button class="form__btn delete_workout hide_btn" data-id="${workout.id}" type="button">
    Delete <i class="fas fa-trash"></i>
    </button>
    </li>
  `;

    form.insertAdjacentHTML('afterend', html);

    const editbtn = document.querySelector('.edit_workout');
    const deletebtn = document.querySelector('.delete_workout');
    const editForm = document.querySelector('.edit_form');

    edit.addEventListener('click', function () {
      edit.classList.toggle('active');
      editbtn.classList.toggle('hide_btn');
      deletebtn.classList.toggle('hide_btn');
      deleteAll.classList.toggle('hidden');
    });

    editForm.addEventListener('submit', this._submitEditForm.bind(this));

    editbtn.addEventListener('click', this._editWorkout.bind(this));

    deletebtn.addEventListener('click', this._deleteWorkout.bind(this));
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      if (work.type === 'running')
        work.prototype = Object.create(Running.prototype);
      if (work.type === 'cycling')
        work.prototype = Object.create(Cycling.prototype);
    });

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  //setting public interface
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _editWorkout(e) {
    const editEl = e.target.closest('.workout');

    const editor = this.#workouts.find(work => work.id === editEl.dataset.id);
    this.#editEvents = editor.id;

    // editEl.classList.add('hide_El');
    this._hideActionButtons(this.#editEvents);
    this._showEditForm(this.#editEvents);
  }

  _hideActionButtons(id) {
    const editbtns = document.querySelectorAll('.edit_workout');
    const deletebtns = document.querySelectorAll('.delete_workout');
    editbtns.forEach(btn => {
      if (btn.dataset.id === id) btn.classList.toggle('hide_btn');
    });
    deletebtns.forEach(btn => {
      if (btn.dataset.id === id) btn.classList.toggle('hide_btn');
    });
  }

  _showEditForm(id) {
    const editforms = document.querySelectorAll('.edit_form');
    editforms.forEach(frm => {
      if (frm.dataset.id === id) frm.classList.remove('hidden');
    });
  }

  _submitEditForm(e) {
    e.preventDefault();
    this._newWorkout(e);
  }

  _deleteWorkout(e) {
    const delEl = e.target.closest('.workout');

    const editor = this.#workouts.find(work => work.id === delEl.dataset.id);
    this._showConfirmOverlay();
    confirmDeleteOne.classList.remove('hide_confirm');
    const newWorkouts = this.#workouts.filter(el => el.id !== editor.id);
    this.#workouts = newWorkouts;
    this.#workouts.forEach(el => this._renderWorkout(el));
  }

  _deleteWorkoutAll(e) {
    // const delEl = e.target.closest('.workout');

    // const editor = this.#workouts.find(work => work.id === delEl.dataset.id);
    this._showConfirmOverlay();
    confirmDeleteAll.classList.remove('hide_confirm');
  }

  _showConfirmOverlay() {
    document.querySelector('.confirm_section').classList.remove('hide_confirm');
    overlay.classList.remove('overlay_hidden');
  }

  _hideConfirmOverlay(e) {
    if (e.key === 'Escape') {
      this._hideOverlay();
    }
    if (e.type === 'keydown') return;
    this._hideOverlay();
  }

  _hideOverlay() {
    confirmDeleteOne.classList.add('hide_confirm');
    confirmDeleteAll.classList.add('hide_confirm');
    document.querySelector('.confirm_section').classList.add('hide_confirm');
    overlay.classList.add('overlay_hidden');
  }

  _confirmations() {
    confirmNo.forEach(el => {
      el.addEventListener('click', this._hideConfirmOverlay.bind(this));
    });
  }
}

const app = new App();

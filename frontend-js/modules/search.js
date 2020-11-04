import axios from "axios";
import DOMPurify from "dompurify";

export default class Search {
  // 1. Select DOM elements, and keep track of any useful data
  // soon as the object is created, then constructor function auto run hiideg.
  constructor() {
    this.injectHTML();
    this.headerSearchIcon = document.querySelector(".header-search-icon");
    this.overlay = document.querySelector(".search-overlay");
    this.closeIcon = document.querySelector(".close-live-search");
    this.inputField = document.querySelector("#live-search-field");
    this.resultsArea = document.querySelector(".live-search-results");
    this.loaderIcon = document.querySelector(".circle-loader");
    this.typingWaitTimer;
    this.previousValue = "";
    this.events();
  }

  // 2. Events. Keep track of any events (mouse click, keystroke etc.)
  events() {
    this.inputField.addEventListener("keyup", () => this.keyPressHandler());
    this.closeIcon.addEventListener("click", () => this.closeOverlay());
    this.headerSearchIcon.addEventListener("click", (e) => {
      e.preventDefault();
      this.openOverlay();
    });
  }

  // 3. Methods
  keyPressHandler() {
    let value = this.inputField.value;

    if (value == "") {
      clearTimeout(this.typingWaitTimer);
      this.hideLoaderIcon();
      this.hideResultsArea();
    }

    if (value != "" && value != this.previousValue) {
      clearTimeout(this.typingWaitTimer);
      // haih zuilee bichij duussanii daraa tsag toolj ehelne gesen ug
      // keypress bolgoniii daraa timelear hiigdene
      this.showLoaderIcon();
      // search typing hiihed urdnii hailtiin ur dynd hide hiih need
      this.hideResultsArea();
      this.typingWaitTimer = setTimeout(() => this.sendRequest(), 750);
    }

    this.previousValue = value;
  }

  sendRequest() {
    axios
      .post("/search", { searchTerm: this.inputField.value })
      .then((response) => {
        // postController.search-ees json(posts) irne
        console.log(response.data);
        // how to render raw json to html. create custom method below
        this.renderResultsHTML(response.data);
      })
      .catch(() => {
        alert("Hello, the request failed.");
      });
  }

  renderResultsHTML(posts) {
    if (posts.length) {
      this.resultsArea.innerHTML = DOMPurify.sanitize(`
        <div class="list-group shadow-sm">
        <div class="list-group-item active"><strong>Search Results</strong>
          (${posts.length > 1 ? `${posts.length} items found` : "1 item found"})
        </div>
          
        ${posts
          .map((post) => {
            let postDate = new Date(post.createdDate);
            return `
            <a href="/post/${
              post._id
            }" class="list-group-item list-group-item-action">
              <img class="avatar-tiny" src="${post.author.avatar}"> 
              <strong>${post.title}</strong>
              <span class="text-muted small">
                by ${post.author.username} on ${
              postDate.getMonth() + 1
            }/${postDate.getDate()}/${postDate.getFullYear()}
              </span>
            </a>
            `;
          })
          .join("")}
          
        </div>
      `);
    } else {
      this.resultsArea.innerHTML = `<p class="alert alert-danger text-center shadow-sm">Sorry, we could not find any results fot that search.</p>`;
    }
    // Hide spinning lodaer icon
    this.hideLoaderIcon();
    // Show resulte Area for searching result to display
    this.showResultsArea();
  }

  showLoaderIcon() {
    this.loaderIcon.classList.add("circle-loader--visible");
  }

  hideLoaderIcon() {
    this.loaderIcon.classList.remove("circle-loader--visible");
  }

  showResultsArea() {
    this.resultsArea.classList.add("live-search-results--visible");
  }

  hideResultsArea() {
    this.resultsArea.classList.remove("live-search-results--visible");
  }

  openOverlay() {
    this.overlay.classList.add("search-overlay--visible");
    setTimeout(() => this.inputField.focus(), 50);
  }

  closeOverlay() {
    this.overlay.classList.remove("search-overlay--visible");
  }

  injectHTML() {
    document.body.insertAdjacentHTML(
      "beforeend",
      `
        <div class="search-overlay">
          <div class="search-overlay-top shadow-sm">
            <div class="container container--narrow">
              <label for="live-search-field" class="search-overlay-icon"><i class="fas fa-search"></i></label>
              <input type="text" id="live-search-field" class="live-search-field" placeholder="What are you interested in?">
              <span class="close-live-search"><i class="fas fa-times-circle"></i></span>
            </div>
          </div>

          <div class="search-overlay-bottom">
            <div class="container container--narrow py-3">
              <div class="circle-loader"></div>
              <div class="live-search-results"></div>
            </div>
          </div>
        </div>
    `
    );
  }
}

/*
export default class Search {
  constructor() {
    this.exampleProperty = x;
  }

  myCoolMethod() {}
}

// Deerh shine class like prototype 
// Doorh ni huuchin traditional approach

function Search() {
    this.exampleProperty = x
}

Search.prototype.myCoolMethod = function() {}

new Search()

*/

$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $favoritedArticles = $("#favorited-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");
  const $navWelcome = $("#nav-welcome");
  const $navDirectory = $("#nav-directory");
  const $submitLink = $("#submit-link");
  const $myStoriesLink = $("#mystories-link");
  const $favoritesLink = $("#favorites-link");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();


  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    
    await generateStories();
    
    //show the create story form
    //$submitForm.show();

    if (currentUser) {
      showNavForLoggedInUser();
    }

  }


  /**
   * Event Handler for Clicking Login - when login is clicked, show the login forms and hide the stories
   */

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });

  /**
   * Event listener for logging in.
   * will either login or create a new user and :
   *  If successful we will setup the user instance
   */

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();

    hideElements();
    await generateStories();
    $allStoriesList.show();

  });

    /**
   * Event listener for signing up / creating an account
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

   /* sync current user information to localStorage */

   function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  } 

 /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * Updates the navigation bar by hiding the login-navigation and showing the directory / logout navlinks
   * 
   */
  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navDirectory.show();
    $navWelcome.text(currentUser.username)
    $navWelcome.show();
    $navLogOut.show();
  }

  //submitStorylink on click - show submit form
  $submitLink.on("click",function(){
    $submitForm.toggle("hidden");
  })

  //submit story form on submit - submit story and update story list / regenerate
  $submitForm.on("submit",async function(evt){
    evt.preventDefault();
    
    //grab the info for the new story
    const newStory = {
      author : $("#author").val(),
      title : $("#title").val(),
      url :  $("#url").val(),
      //username : currentUser.username,
    }
    
    //call the function addStory to add it to the API
    await storyList.addStory(currentUser, newStory);
   
    $submitForm.hide();

    //reset the submit form values
    $("#author").val("");
    $("#title").val("");
    $("#url").val("");

    //rebuild the stories list with your new story
    await generateStories();
    $allStoriesList.show();
  })

  $favoritesLink.on("click",async function(){
    hideElements();
    $favoritedArticles.show();

    //get a fresh user with new user.favorites
    await checkIfLoggedIn();
    
    //get the current users favorite stories
    let storyList = currentUser.favorites;
    $favoritedArticles.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList) {
      const result = generateStoryHTML(story);
      $favoritedArticles.append(result);
    }
  })

  $myStoriesLink.on("click",async function(){
    await generateMyStories();
  })

  //get my stories, add a trash can to them, and append them to my stories area
  async function generateMyStories(){
    hideElements();
    $ownStories.show();

    await checkIfLoggedIn();

    let storyList = currentUser.ownStories;
    $ownStories.empty();

    //loop through all of own stories and generate HTML for them
    for (let story of storyList){
      const result = generateStoryHTML(story);
      const trashCan = document.createElement('span');
      trashCan.innerHTML = "<span class='trash-can'><i class='fa fa-trash'></i></span>";
      result.prepend(trashCan);
      $ownStories.append(result);
    }
  }

  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function() {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });



  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);
    //let starStyle = isFavoriteStory(story);
    //console.log(starStyle);

    let starStyle = "";
    
    if (!currentUser){
      starStyle = "far"
    } else{
      starStyle = isFavoriteStory(story)
    }

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      <span class="star">
        <i class="${starStyle} fa-star"></i>
      </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }


  function isFavoriteStory(story){
    const testStoryId = story.storyId;
    //86console.log(testStoryId)
    const favoriteStories = currentUser.favorites;
    const favoriteStoryIds = favoriteStories.map(function(id){
      return id.storyId
    });
    //86console.log(favoriteStoryIds);
    if(favoriteStoryIds.includes(testStoryId)){
      return "fas";
    } else{
      return "far";
    }
  }

  //click a star, add the story as a favorite and regenerate
  $("body").on("click",".star",async function(e){
    //get the storyId from the closest li storyId
    const storyId = $(e.target).closest("li").attr("id");
    //const userNow = new User(getLoggedInUser());

    //determine if it is already favorited (has class fas) toggle class and deleteFavoriteStory
    if ($(e.target).hasClass("fas")){
      //86console.log("GO");
      $(e.target).toggleClass("fas far");
      let response = await User.deleteFavoriteStory(currentUser, storyId);
      //86console.log("DELETE");
    } else {
      $(e.target).toggleClass("fas far");
      let response2 = await User.addFavoriteStory(currentUser, storyId);
      //86console.log("ADD");
    }
  })

  //click a trash can, delete the story and regenerate
  $("body").on("click",".trash-can",async function(e){
    //get the storyId from the closest li storyId
    const storyId = $(e.target).closest("li").attr("id");
    //86console.log(storyId);

    let response = await User.deleteOwnStory(currentUser, storyId);
    await generateMyStories();
  })

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $favoritedArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

});

$(function() 
{

  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize varibles

  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $passwordInput = $('.passwordInput'); // Input for password
  var $regPass1Input = $('.regPass1Input'); // Input for register password
  var $regPass2Input = $('.regPass2Input'); // Input for register password check
  var $regEmailInput = $('.regEmailInput'); // Input for register email



  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $loginPage = $('.login.page'); // The login page
  var $passwordPage = $('.password.page'); // The password page
  var $registerPage = $('.register.page'); // The register page
  var $chatPage = $('.chat.page'); // The chatroom page
  var $greeting = $('span#greeting');
  // Prompt for setting a username
  var username = "";
  var password = "";
  var regPass1 = "";
  var regPass2 = "";
  var regEmail = "";
  var registered = false;
  var newUser = false;
  var passwordValid = false;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();

  var socket = io.connect();


  function addParticipantsMessage (data) 
  {
    var message = '';
    if (data.numUsers === 1) {
      message += "there is 1 participant";
    } else {
      message += "there are " + data.numUsers + " participants";
    }
    log(message);
  }

  // Sets the client's username
  function setUsername () 
  {
    username = cleanInput($usernameInput.val().trim()); 
    socket.emit('user check', username);
    $registerPage.hide();
    $greeting.text(username);
  }
  function registerUser() 
  {
    regPass1 = cleanInput($regPass1Input.val().trim());
    regPass2 = cleanInput($regPass2Input.val().trim());
    regEmail = cleanInput($regEmailInput.val().trim());

    if(regPass1 && regPass2 && regEmail)
    {
       socket.emit('register user', username, regPass1,regPass2,regEmail);
       $regPass1Input.css('color', '#fff');
    $regPass2Input.css('color', '#fff');
    $regEmailInput.css('color', '#fff');

    }
  }

  function setPassword() 
  {
   
    password = cleanInput($passwordInput.val().trim());
   
    socket.emit('pw check', username, password);

  }

  function validPassword()
  {
    
    $passwordPage.fadeOut();
    $chatPage.show();
    $passwordPage.off('click');
    $currentInput = $inputMessage.focus();
    passwordValid = true;
    
      // Tell the server your username
      socket.emit('add user', username);

  }
  function invalidPassword()
  {
    $('div#passDiv.form').effect('shake',{distance:5},500).distance(10);
  
  }

  // Sends a chat message
  function sendMessage () 
  {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', message);
    }
  
  }

  // Log a message
  function log (message, options) 
  {
    var el = '<li class="log">' + message + '</li>';
    addMessageElement(el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) 
  {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var colorStyle = 'style="color:' + getUsernameColor(data.username) + '"';
    var usernameDiv = '<span class="username"' + colorStyle + '>' +
      data.username + '</span>';
    var messageBodyDiv = '<span class="messageBody">' +
      data.message + '</span>';

    var typingClass = data.typing ? 'typing' : '';
    var messageDiv = '<li class="message ' + typingClass + '">' +
    usernameDiv + messageBodyDiv + '</li>';
    var $messageDiv = $(messageDiv).data('username', data.username);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addChatTyping (data) 
  {
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) 
  {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) 
  {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput (input) 
  {
    return $('<div/>').text(input).html() || input;
  }

  // Updates the typing event
  function updateTyping () 
  {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) 
  {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) 
  {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(function (event) 
  {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) 
    {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (passwordValid && registered) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } 
      else if (registered)
      {
        setPassword();
      }
      else if(newUser)
      {
        registerUser();
      }
      else 
      {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', function() 
  {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () 
  {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () 
  {
    $inputMessage.focus();
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) 
  {
    connected = true;
    // Display the welcome message
    var message = "Iridium Chat v0.0.2 &mdash; ";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) 
  {
    addChatMessage(data);
  });

  socket.on('valid pw', function () 
  {
    validPassword();
  });
  socket.on('invalid pw', function () 
  {
    invalidPassword();
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) 
  {
    log(data.username + ' joined');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) 
  {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) 
  {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) 
  {
    removeChatTyping(data);
  });
  socket.on('registration complete',function(data)
  {
    $registerPage.fadeOut();
    $passwordPage.fadeOut();
    $chatPage.show();
    $registerPage.off('click');
    $passwordPage.off('click');
    $currentInput = $inputMessage.focus();
    registered = true;
    newUser = false;
    passwordValid = true;
    
    // Tell the server your username
    socket.emit('add user', username);

  });
  socket.on('password mismatch',function(data)
  {

    $regPass1Input.css('color', '#f00');
    $regPass2Input.css('color', '#f00');
  });
  socket.on('email invalid',function(data)
  {
    $regEmailInput.css('color', '#f00');
  });
  socket.on('user valid',function(data)
  {
    registered = true;
    $loginPage.fadeOut();
    $passwordPage.show();
    $loginPage.off('click');
    $currentInput = $passwordInput.focus();
  });
  socket.on('user invalid',function(data)
  {
    newUser = true;
    $loginPage.fadeOut();
    $registerPage.show();
    $loginPage.off('click');
    $regPass1Input.focus();
    currentInput = $passwordInput; 
  });
});
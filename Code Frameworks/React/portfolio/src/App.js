import React, { Component } from "react";
import logo from './logo.svg';
import './App.css';

import Grid from '@material-ui/core/Grid';


class App extends Component {


  render (){
    return(
    <div className="App">
      <header className="App-header">
        <h1>Jake Lund</h1>
      </header>

      <body>
        <nav className="App-nav">
          <button>
            Home
          </button>
          <button>
            About
          </button>
          <button>
            Contact
          </button>
          <button>
            Projects
          </button>
          <button>
            CV
          </button>
        </nav>

        <div className='Main-image'>
          <img>
          </img>
        </div>
       
        <div className="About">
          <h2>
            About Jake Lund
          </h2>
          <p>
            Some stuff about me saldfjl asdfjasd alsdjf a dslkja fajsdlkf alsdkjf sdlafj alsdfjlasd 
          </p>
        </div>

        <div className='Contact'>

        </div>

        <div className='Projects'>

        </div>

        <div className='CV'>
          <Grid container spacing={12}>
            <Grid item xs={6}>
              <div>
                <h1>
                  Get In Touch
                </h1>
                <p>
                  jakeandrewlund@hotmail.com<br/>
                  (1)-204-898-0368
                </p>
              </div>
            </Grid>
            <Grid item xs={6}>
              <div>
               <form>
                  <input type="text" id="contact-name" placeholder="Name"></input>
                  <input type="text" id="contact-email" placeholder="Email"></input>
                  <input type="text" id="contact-phone" placeholder="Phone"></input>
                  <input type="text" id="contact-subject" placeholder="Subject"></input>
                  <input type="text" id="contact-message" placeholder="Type your message here"></input>
                  <input type="submit" id="contact-submit"></input>
               </form>
              </div>
            </Grid>
          </Grid>
        </div>
      
      </body>

    </div>
    );
  }
}

export default App;

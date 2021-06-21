import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-servers',
  templateUrl: './servers.component.html',
  styleUrls: ['./servers.component.css']
})
export class ServersComponent implements OnInit {
  allowNewServer = false; 
  serverCreationStatus = 'No server was created!';
  serverName = '';
  userName = '';
  serverCreated = false;
  showSecret = false;
  buttonCount = [];

  constructor() {
    setTimeout(() => {
      this.allowNewServer = true;
    },2000);
   }

  ngOnInit(): void {
  }

  onCreateServer() {
    this.serverCreationStatus = 'Server was created! ' + 'Named ' + this.serverName;
    this.serverCreated = true;
  }

  onUpdateServerName(event: any){
    this.serverName = (<HTMLInputElement>event.target).value;
  }

  resetName(){
    this.userName='';
  }

  onButtonPress(){
    this.showSecret = !this.showSecret;
    this.buttonCount.push(this.buttonCount.length + 1);
  }
}

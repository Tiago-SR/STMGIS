import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  menuOpen: boolean = false;
  dropdownOpen: boolean = false;
  nickName: string = '';
  public isLogged: boolean = false;

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  constructor(private authService: AuthService) {}
  ngOnInit() {
    this.authService.checkAndRenewToken();
    this.authService.isLoggedIn.subscribe(info => {
      this.isLogged = info.isLogged;
      if (info.isLogged)
        this.nickName = info.nickName
      
    });
    
  }

  logout() {
    this.authService.logout()
  }
}

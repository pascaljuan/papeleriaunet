import { Component, ViewChild, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { TokenService } from '../login/token';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { DialogoConfirmacionComponent } from "../dialogo.confirmacion/dialogo.component"

@Component({
  selector: 'app-buscarUsuario',
  templateUrl: './buscar.component.html',
  styleUrls: ['./buscar.component.css']
})
export class buscarUsuarioComponent {

  constructor(private router: Router, private http: HttpClient, private tokenService: TokenService, public dialogo: MatDialog) { }


  columnas: string[] = ['_id', 'username', 'email', 'roles', 'accion'];

  pageEvent!: PageEvent;
  pageIndex: number = 0;
  pageSize !: number;
  length!: number;
  pageSizeOptions = [10];
  isLoadingResults: boolean = false;
  dataSourceUsuarios: any;
  opened: boolean = false;
  mensajeExitoso: string = '';
  mensajeFallido: string = '';

  ngOnInit() {
    this.buscarUsuario();
  }

  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;

  async buscarUsuario() {
    const token = this.tokenService.token;
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'x-access-token': `${token}`,
      })
    };
    try {
      this.isLoadingResults = true;
      this.http.get<any>('https://p02--node-launet--m5lw8pzgzy2k.code.run/api/users', httpOptions)
        .subscribe(response => {
          if (response.Status) {
            this.dataSourceUsuarios = new MatTableDataSource(response.Data.docs);
            this.dataSourceUsuarios.paginator = this.paginator;
            this.pageSize = response.Data.docs.limit;
            this.pageIndex = response.Data.docs.page;
            this.length = response.Data.totalDocs;
            console.log('Respuesta del servidor:', response);
          }
          this.isLoadingResults = false;
        });
    } catch (error) {
      this.isLoadingResults = false;
      this.mensajeFallido = 'Error al consultar. Por favor, inténtelo nuevamente.';
      console.error('Error en la solicitud:', error);
    }

  }

  async recargarUsuario(page: PageEvent) {
    this.dataSourceUsuarios = new MatTableDataSource;
    const token = this.tokenService.token;
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'x-access-token': `${token}`,
      })
    };

    try {
      this.isLoadingResults = true;
      this.http.get<any>(`https://p02--node-launet--m5lw8pzgzy2k.code.run/api/users?page=${this.paginator.pageIndex + 1}&limit=${this.paginator.pageSize}`, httpOptions)
        .subscribe(response => {
          if (response.Status) {
            this.dataSourceUsuarios = new MatTableDataSource(response.Data.docs);
            this.pageIndex = response.Data.docs.page;
            console.log('Respuesta del servidor:', response);
          }
          this.isLoadingResults = false;
        });  
    } catch (error) {
      this.mensajeFallido = 'Error al consultar. Por favor, inténtelo nuevamente.';
      console.error('Error en la solicitud:', error);
    }

  }


  borrarUsuario(id: string) {
    const token = this.tokenService.token;
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'x-access-token': `${token}`
      })
    };
    try {
      this.http.delete<any>(`https://p02--node-launet--m5lw8pzgzy2k.code.run/api/users/${id}`, httpOptions )
      .subscribe(response => {
        if (response.Status) {
          console.log('Usuario borrado exitosamente');
          console.log('Respuesta del servidor:', response);
          this.mensajeExitoso = "Usuario eliminado exitosamente"
        }
      })  
    } catch (error) {
      this.mensajeFallido = 'Error al eliminar. Por favor, inténtelo nuevamente.';
      console.error('Error en la solicitud:', error);
    }
    setTimeout(() => {
      this.refreshPage();
    }, 3000);
  };

  filtrar(event: Event) {
    const filtro = (event.target as HTMLInputElement).value;
    this.dataSourceUsuarios.filter = filtro.trim().toLowerCase();
  }


  mostrarDialogo(id:string): void {
    this.dialogo
      .open(DialogoConfirmacionComponent, {
        data: `Seguro deseas ELIMINARLO?`
      })
      .afterClosed()
      .subscribe((confirmar: Boolean) => {
        if (confirmar) {
          this.borrarUsuario(id)
        } else {
          //alert("No hacer nada");
        }
      });
  }

  refreshPage() {
    window.location.reload();
  }

}


export class Usuario {
  constructor(public id: string, public username: string, public email: String,
    public password: string, public roles: string
  ) { }
}

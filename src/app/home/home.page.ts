import { Component, OnInit } from '@angular/core';
import { BluetoothSerial } from '@ionic-native/bluetooth-serial/ngx';
import { AlertController } from '@ionic/angular';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit{

  constructor(private bluetoothSerial: BluetoothSerial,private alertControler: AlertController) {}
  
  setPoint = 0;
  Kc:string = '0';
  Ti:string = '0';
  lazo = false;
  sendCommand = 0x80;
  getCommand = 0x00;
  avaliableTemperature = false;
  avaliableLuminosity = false;
  toggleVariable = false;
  data = new Uint8Array(2);  
  dataLED = new Uint8Array(4);
  counter = 0;
  isNotConnected:Boolean = true;
  devices = [];
  dataReceived = [];

  ngOnInit(): void {
    this.bluetoothState();
    this.bluetoothSerial.clear();
    setInterval(()=>{this.getVariables();}, 1000);
  }

  sendTi(){
    var patt= new RegExp('^([0-9]+)\.([0-9]+)$');
    if(patt.test(this.Kc)){
      let dataControl = new Uint8Array(this.Ti.length + 2);
      dataControl[0] = 0x33;
      for (let i = 0; i < this.Ti.length; i++) {
        dataControl[i+1] = this.Ti[i].charCodeAt(0);
      }
      dataControl[this.Ti.length + 1] = '$'.charCodeAt(0);
      this.setData(dataControl)
    }
  }

  sendSetPoint(){
    this.data[0] = (this.lazo) ? 0x31 : 0x30;
    this.data[1] = this.setPoint;
    this.setData(this.data);
  }

  sendKc(){
    var patt= new RegExp('^([0-9]+)\.([0-9]+)$');
    if(patt.test(this.Kc)){
      let dataControl = new Uint8Array(this.Kc.length + 2);
      dataControl[0] = 0x32;
      for (let i = 0; i < this.Kc.length; i++) {
        dataControl[i+1] = this.Kc[i].charCodeAt(0);
      }
      dataControl[this.Kc.length + 1] = '$'.charCodeAt(0);
      this.setData(dataControl)
    }
  }

  getVariables(){
    if (this.toggleVariable) {
      this.toggleVariable = !this.toggleVariable;
      this.getLuminosity();
    } else {
      this.toggleVariable = !this.toggleVariable;
      this.getTemperature();
    }
  }

  getLuminosity(){
    if (this.avaliableLuminosity) {
      var dataLuminosity = new Uint8Array(4);
      dataLuminosity[0] = 0x24;
      dataLuminosity[1] = this.getCommand | 0x01;
      dataLuminosity[2] = 0x00;
      dataLuminosity[3] = (dataLuminosity[0]+dataLuminosity[1]+dataLuminosity[2])%256;
      this.setData(dataLuminosity);
      this.avaliableLuminosity = false;
    }

    setTimeout(() => {
      this.bluetoothSerial.read().then(
        (data)=>{
          if (data.length == 4) {
            if (data[0]=='$') {
              if ((data[0].charCodeAt(0)+data[1].charCodeAt(0)+data[2].charCodeAt(0))%128==data[3].charCodeAt(0)) {
                this.bluetoothSerial.clear();
                this.avaliableLuminosity = true;
              }
            }
          }
        }
      );
    }, 500);
  }

  getTemperature(){
    if (this.avaliableTemperature){
      var dataTemperature = new Uint8Array(4);
      dataTemperature[0] = 0x24;
      dataTemperature[1] = this.getCommand | 0x00;
      dataTemperature[2] = 0x00;
      dataTemperature[3] = (dataTemperature[0]+dataTemperature[1]+dataTemperature[2])%256;
      this.setData(dataTemperature);
      this.avaliableTemperature = false;
    }
    setTimeout(() => {
      this.bluetoothSerial.read().then(
        (data)=>{
          if (data.length == 4) {
            if (data[0]=='$') {
              if ((data[0].charCodeAt(0)+data[1].charCodeAt(0)+data[2].charCodeAt(0))%128==data[3].charCodeAt(0)) {
                this.bluetoothSerial.clear();
                this.avaliableTemperature = true;
              }
            }
          }
        }
      );
    }, 500);
  }


  bluetoothState(){
    this.bluetoothSerial.isEnabled().then(
      () => {
        this.isConnected();
      },() => {
        this.showBluetoothSettings();
      }
    );
  }

  showBluetoothSettings(){
    this.bluetoothSerial.showBluetoothSettings().then(
      ()=>{
        this.isConnected();
      },
      () => {
        console.log('Encienda el bluetooth');
      }
    )
  }

  isConnected(){
    this.bluetoothSerial.isConnected().then(
      ()=>{
        this.isNotConnected = false;
      },
      () => {
        this.isNotConnected = true;
        this.listDevices();
      }
    );
  }

  listDevices(){
    this.bluetoothSerial.list().then(
      (response) => {
        this.devices = response;
      },
      () => {
        console.log('No se pudo listar los dispositivos');
      }
    );
  }

  connect(address){
    this.bluetoothSerial.isEnabled().then(
      () => {
        this.bluetoothSerial.isConnected().then(
          ()=>{
            this.closeConnection();
          },
          () => {
            this.bluetoothSerial.connect(address).subscribe(
              () =>{
                this.isNotConnected = false;
                this.avaliableTemperature = true;
                this.avaliableLuminosity = true;
              },
              ()=>{
                this.isNotConnected = true;
              }
            );
          }
        );
      },() => {
        this.showBluetoothSettings();
      }
    );
  }

  setData(data) {
    this.bluetoothSerial.write(data).then(
      () => {
        console.log('Mensaje enviado exitosamente');
      },
      () => {
        console.log('Mensaje no pudo ser enviado');
      }
    );
  }

  closeConnection(){
    this.bluetoothSerial.disconnect();
    this.bluetoothState();
  }

  async isEnabled(msg){
    const alert= await this.alertControler.create({
      header: 'Alerta',
      message: msg,
      buttons: [{
        text:"Ok"
      }]
    })
  }

}

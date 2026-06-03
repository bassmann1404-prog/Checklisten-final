import Dexie, { type Table } from 'dexie';

export interface Device {
  id?: number;
  name: string;
  minTemp: number;
  maxTemp: number;
}

export interface TempMeasurement {
  id?: number;
  deviceId: number;
  temperature: number;
  timestamp: Date;
}

export interface CleaningTask {
  id?: number;
  name: string;
  interval: 'täglich' | 'wöchentlich' | 'monatlich';
}

export interface CleaningLog {
  id?: number;
  taskId: number;
  timestamp: Date;
  completed: boolean;
}

export interface Supplier {
  id?: number;
  name: string;
}

export interface Delivery {
  id?: number;
  supplierName: string;
  productName: string;
  deliveryNote: string;
  temperature: number;
  isOk: boolean;
  timestamp: Date;
}

export interface FryerLog {
  id?: number;
  action: string;
  value: string;
  timestamp: Date;
}

export class HACCPDatabase extends Dexie {
  devices!: Table<Device>;
  tempMeasurements!: Table<TempMeasurement>;
  cleaningTasks!: Table<CleaningTask>;
  cleaningLogs!: Table<CleaningLog>;
  suppliers!: Table<Supplier>;
  deliveries!: Table<Delivery>;
  fryerLogs!: Table<FryerLog>;

  constructor() {
    super('GastroHygienePilotDB');
    this.version(2).stores({
      devices: '++id, name',
      tempMeasurements: '++id, deviceId, timestamp',
      cleaningTasks: '++id, name, interval',
      cleaningLogs: '++id, taskId, timestamp',
      suppliers: '++id, name',
      deliveries: '++id, supplierName, timestamp',
      fryerLogs: '++id, action, timestamp'
    });
  }
}

export const db = new HACCPDatabase();

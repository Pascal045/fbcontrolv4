import { firestore } from '../config/firebase';
import { firestore as firebaseAdmin } from 'firebase-admin';
import { IEvent } from '../interfaces/event.interface';
import { IRoom } from '../interfaces/room.interface';

export class FirebaseService {
  static async loadEvents(): Promise<IEvent[]> {
    const eventSnap = await firestore.collection('events').get();
    const events = FirebaseService.getDataFromSnapshot(eventSnap);
    console.log('Request Events');
    return events as IEvent[];
  }
  
  static async loadRooms(): Promise<IRoom[]> {
    const roomSnap = await firestore.collection('rooms').get();
    const rooms = FirebaseService.getDataFromSnapshot(roomSnap);
    console.log('Request Rooms');
    return rooms as IRoom[];
  }

  static async appendEndlessEvent(allEvents: IEvent[], seriesId: string): Promise<void> {
    const eventSeries = allEvents.filter(e => e.seriesId = seriesId).sort((a, b) => {
      if (a.start > b.start) {
        return -1;
      } else if (a.start < b.start) {
        return 1;
      } else {
        return 0;
      }
    });
    const lastEvent = eventSeries[0];
    if (lastEvent.seriesId && lastEvent.seriesNr) {
      const nextEvent = FirebaseService.eventNextWeek(lastEvent, lastEvent.seriesNr+1, lastEvent.seriesId);
      const validRoom = FirebaseService.checkRoomValidity(nextEvent, allEvents);
      const valid = nextEvent.seriesDuringHoliday? true : FirebaseService.checkValidity(nextEvent, allEvents);
      if (valid && validRoom) {
        console.log('--- Create new endless Event!');
        FirebaseService.saveEvent(nextEvent);
      }
    }
  }

  private static getDataFromSnapshot(snapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>): FirebaseFirestore.DocumentData[] {
    return snapshot.docs.map((value: any) => {
      return {
        ...value.data(),
        id: value.id
      };
    });
  }

  private static eventNextWeek(event: IEvent, seriesNr: number, seriesId: string): IEvent {
    const newEvent: IEvent = {
      ...event,
      start: firebaseAdmin.Timestamp.fromDate(new Date(event.start.toDate().getTime() + 7 * 24 * 60 * 60 * 1000)),
      end: firebaseAdmin.Timestamp.fromDate(new Date(event.end.toDate().getTime() + 7 * 24 * 60 * 60 * 1000)),
      seriesId,
      seriesNr
    }
    return newEvent;
  }

  static checkValidity(event: IEvent, events: IEvent[]): boolean {
    let validity = true;
    const backgroundEvents = events.filter(e => e.background);
    backgroundEvents.forEach(backEvent => {
      if (event.start.toDate() >= backEvent.start.toDate() && event.start.toDate() <= backEvent.end.toDate() ||
      event.end.toDate() >= backEvent.start.toDate() && event.end.toDate() <= backEvent.end.toDate()) {
        validity = false;
      }
    });
    return validity;
  }

  private static checkRoomValidity(event: IEvent, events: IEvent[]): boolean {
    let validity = true;
    const sameRoomEvents = events.filter(e => (e.roomId === event.roomId) && (e.id !== event.id));
    sameRoomEvents.forEach(roomEvent => {
      if (event.start.toDate() >= roomEvent.start.toDate() && event.start.toDate() <= roomEvent.end.toDate() ||
      event.end.toDate() >= roomEvent.start.toDate() && event.end.toDate() <= roomEvent.end.toDate()) {
        validity = false;
      }
    });
    return validity;
  }

  private static async saveEvent(event: IEvent): Promise<void> {
    const eventsColl = firestore.collection('events');
    await eventsColl.add({...event});
  }
}
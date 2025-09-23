import type { Participant } from '../../types/ParticipantTypes';

export class ParticipantManager {
  private participants: Map<string, Participant> = new Map();

  addParticipant(user: Participant) {
    this.participants.set(user.id, user);
  }

  removeParticipant(userId: string) {
    this.participants.delete(userId);
  }

  listParticipants(): Participant[] {
    return Array.from(this.participants.values());
  }
}

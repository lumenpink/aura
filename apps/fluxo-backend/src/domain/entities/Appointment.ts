/**
 * Appointment Domain Entity
 * Pure business model representation, decoupled from any database or infrastructure-specific concern.
 */
export class Appointment {
  constructor(
    public readonly id: string,
    public readonly patientName: string,
    public readonly appointmentDate: Date,
    public readonly status: string,
    public readonly createdAt: Date
  ) {}
}

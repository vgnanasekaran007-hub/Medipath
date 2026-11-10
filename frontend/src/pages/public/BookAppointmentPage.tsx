import type { DoctorSchedule } from '@medipath/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Accessibility, Calendar, Check, Clock } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, ErrorBanner, LoadingState } from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { useAppStore } from '../../stores/appStore';

function nextMatchingDate(schedules: DoctorSchedule[], doctorId: string): string {
  const days = new Set(
    schedules.filter((s) => s.doctorId === doctorId && s.isAvailable).map((s) => s.dayOfWeek),
  );
  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);
  for (let offset = 0; offset < 14; offset++) {
    const candidate = new Date(base.getTime() + offset * 86400000);
    if (days.has(candidate.getUTCDay())) {
      return candidate.toISOString().slice(0, 10);
    }
  }
  return new Date(base.getTime() + 86400000).toISOString().slice(0, 10);
}

export function BookAppointmentPage() {
  const { t, tf } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAppStore((s) => s.user);
  const storeAccessible = useAppStore((s) => s.accessibleOnly);

  const doctorsQuery = useQuery({ queryKey: ['doctors'], queryFn: () => api.getDoctors() });
  const doctors = doctorsQuery.data?.doctors ?? [];
  const schedules = doctorsQuery.data?.schedules ?? [];

  const [doctorId, setDoctorId] = useState(searchParams.get('doctorId') ?? '');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [slotTime, setSlotTime] = useState('');
  const [patientName, setPatientName] = useState(user?.fullName ?? '');
  const [patientEmail, setPatientEmail] = useState(user?.email ?? '');
  const [patientPhone, setPatientPhone] = useState(user?.phone ?? '+91 98401 00000');
  const [reason, setReason] = useState('');
  const [accessibilityNeeded, setAccessibilityNeeded] = useState(
    user?.accessibilityRequired ?? storeAccessible,
  );
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId && doctors.length > 0) {
      setDoctorId(doctors[0].id);
    }
  }, [doctorId, doctors]);

  useEffect(() => {
    if (doctorId && schedules.length > 0 && !appointmentDate) {
      setAppointmentDate(nextMatchingDate(schedules, doctorId));
    }
  }, [doctorId, schedules, appointmentDate]);

  const slotsQuery = useQuery({
    queryKey: ['doctor-slots', doctorId, appointmentDate],
    queryFn: () => api.getDoctorAvailableSlots(doctorId, appointmentDate),
    enabled: Boolean(doctorId && appointmentDate),
  });

  useEffect(() => {
    const firstOpen = slotsQuery.data?.slots.find((s) => s.available);
    setSlotTime(firstOpen ? firstOpen.time : '');
  }, [slotsQuery.data]);

  const mutation = useMutation({
    mutationFn: api.bookAppointment,
    onSuccess: ({ appointment }) => {
      navigate(
        `/appointments/confirmation/${encodeURIComponent(appointment.id)}?email=${encodeURIComponent(appointment.patientEmail)}`,
      );
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!doctorId || !appointmentDate || !slotTime) {
      setFormError('Please select a specialist, consultation date, and open time slot.');
      return;
    }
    if (reason.trim().length < 3) {
      setFormError('Please enter a brief consultation reason (at least 3 characters).');
      return;
    }
    mutation.mutate({
      doctorId,
      appointmentDate,
      slotTime,
      patientName: patientName.trim(),
      patientEmail: patientEmail.trim(),
      patientPhone: patientPhone.trim(),
      reason: reason.trim(),
      accessibilityNeeded,
      notes: notes.trim() || undefined,
    });
  };

  if (doctorsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-editorial px-4 py-12 sm:px-6">
        <LoadingState />
      </div>
    );
  }

  const selectedDoc = doctors.find((d) => d.id === doctorId);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <div className="border-b border-champagne-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink">
          Outpatient Dispatch
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">
          {t.appointments.bookTitle}
        </h1>
        <p className="mt-2 text-sm text-ink">
          Reserve a double-booking-protected consultation slot linked directly to your doctor’s
          pavilion suite and turn-by-turn 3D directions.
        </p>
      </div>

      {formError && <ErrorBanner title="Booking check" message={formError} />}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-architectural border border-champagne-border bg-surface p-6 sm:p-8"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="book-doctor"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink"
            >
              {t.appointments.selectDoctor}
            </label>
            <select
              id="book-doctor"
              value={doctorId}
              onChange={(e) => {
                const nextId = e.target.value;
                setDoctorId(nextId);
                setAppointmentDate(nextMatchingDate(schedules, nextId));
              }}
              className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
            >
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {tf(doc.fullName, doc.fullNameTa)} — {tf(doc.specialty, doc.specialtyTa)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="book-date"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink"
            >
              {t.appointments.selectDate}
            </label>
            <div className="relative">
              <Calendar
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink"
                aria-hidden="true"
              />
              <input
                id="book-date"
                type="date"
                required
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface pl-9 pr-3 text-sm text-ink tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Real-Time Slot Grid */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink">
              {t.appointments.selectSlot}
            </span>
            {selectedDoc && (
              <span className="text-xs font-medium text-ink tabular-nums">
                Fee: ₹{selectedDoc.consultationFee}
              </span>
            )}
          </div>
          {slotsQuery.isLoading ? (
            <p className="text-xs text-ink">Checking specialist schedule…</p>
          ) : (slotsQuery.data?.slots.length ?? 0) === 0 ? (
            <div className="rounded border border-champagne-border bg-ivory p-4 text-sm text-ink">
              No clinic sessions scheduled on this weekday. Try clicking{' '}
              <button
                type="button"
                className="font-semibold text-ink underline"
                onClick={() => setAppointmentDate(nextMatchingDate(schedules, doctorId))}
              >
                next open clinic day
              </button>
              .
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slotsQuery.data?.slots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available}
                  onClick={() => setSlotTime(slot.time)}
                  className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-architectural border text-xs font-semibold tabular-nums transition ${
                    !slot.available
                      ? 'cursor-not-allowed border-champagne-border bg-ivory text-ink/40 line-through'
                      : slotTime === slot.time
                        ? 'border-teal-deep bg-teal-deep text-white'
                        : 'border-champagne-border bg-ivory/70 text-ink hover:border-champagne'
                  }`}
                >
                  {slotTime === slot.time && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  <Clock className="h-3 w-3 opacity-80" aria-hidden="true" />
                  <span>{slot.time}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contact Details */}
        <fieldset className="space-y-4 border-t border-champagne-border pt-6">
          <legend className="text-xs font-semibold uppercase tracking-wider text-ink">
            {t.appointments.patientDetails}
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="patient-name" className="mb-1 block text-xs font-medium text-ink">
                Full Name
              </label>
              <input
                id="patient-name"
                type="text"
                autoComplete="name"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
              />
            </div>
            <div>
              <label htmlFor="patient-email" className="mb-1 block text-xs font-medium text-ink">
                Email Address
              </label>
              <input
                id="patient-email"
                type="email"
                autoComplete="email"
                required
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
              />
            </div>
            <div>
              <label htmlFor="patient-phone" className="mb-1 block text-xs font-medium text-ink">
                Phone Number
              </label>
              <input
                id="patient-phone"
                type="tel"
                autoComplete="tel"
                required
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink"
              />
            </div>
          </div>

          <div>
            <label htmlFor="visit-reason" className="mb-1 block text-xs font-medium text-ink">
              {t.appointments.reasonLabel}
            </label>
            <input
              id="visit-reason"
              type="text"
              required
              placeholder="e.g., Annual cardiac review, knee follow-up, lab interpretation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[44px] w-full rounded-architectural border border-champagne-border bg-surface px-3 text-sm text-ink placeholder:text-ink/60"
            />
          </div>

          <div>
            <label htmlFor="visit-notes" className="mb-1 block text-xs font-medium text-ink">
              Optional Notes (Wheelchair, Interpreter, Prior Reports)
            </label>
            <textarea
              id="visit-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-architectural border border-champagne-border bg-surface p-3 text-sm text-ink"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-architectural border border-champagne-border bg-ivory/70 p-3.5 text-sm">
            <input
              type="checkbox"
              checked={accessibilityNeeded}
              onChange={(e) => setAccessibilityNeeded(e.target.checked)}
              className="h-4 w-4 rounded border-champagne-border"
            />
            <span className="flex items-center gap-2 font-medium text-ink">
              <Accessibility className="h-4 w-4 text-ink" aria-hidden="true" />
              {t.appointments.accessibilityCheck}
            </span>
          </label>
        </fieldset>

        <div className="flex items-center justify-end gap-3 border-t border-champagne-border pt-5">
          <Button type="submit" size="lg" loading={mutation.isPending}>
            {t.appointments.confirmBooking}
          </Button>
        </div>
      </form>
    </div>
  );
}

import { NODE_IDS } from '@medipath/shared';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Compass, PhoneCall } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, LoadingState } from '../../components/ui/Primitives';
import { useTranslation } from '../../i18n/translations';
import { api } from '../../lib/api';
import { getServiceMedia } from '../../lib/hospitalMedia';
import { useAppStore } from '../../stores/appStore';

export function EmergencyPage() {
  const { tf } = useTranslation();
  const navigate = useNavigate();
  const setStartNodeId = useAppStore((s) => s.setStartNodeId);
  const setEndNodeId = useAppStore((s) => s.setEndNodeId);
  const setAccessibleOnly = useAppStore((s) => s.setAccessibleOnly);

  const overviewQuery = useQuery({
    queryKey: ['hospital-overview'],
    queryFn: api.getHospitalOverview,
  });

  if (overviewQuery.isLoading) {
    return (
      <div className="mx-auto max-w-editorial px-4 py-12 sm:px-6">
        <LoadingState />
      </div>
    );
  }

  const hospital = overviewQuery.data?.hospital;
  const erMedia = getServiceMedia(undefined, 'emergency');

  return (
    <div className="mx-auto max-w-editorial space-y-8 px-4 py-10 sm:px-6">
      <div className="grid overflow-hidden rounded-architectural border-2 border-emergency bg-surface lg:grid-cols-12">
        <div className="p-6 sm:p-10 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-emergency">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <span>24/7 Emergency &amp; Trauma Access (Sample Campus)</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-semibold text-ink">
            West Gate A — Zero-Step Ambulance &amp; Urgent Care Entrance
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink">
            For life-threatening emergencies outside the hospital, call local emergency services
            immediately. When arriving at Aurelia Pavilion, head directly to{' '}
            <strong>Emergency Ramp Gate A</strong> on the West Ground facade (Level 0).
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href={`tel:${hospital?.emergencyPhone ?? '+914440192911'}`}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-architectural bg-emergency px-6 text-sm font-semibold text-white hover:bg-emergency/90"
            >
              <PhoneCall className="h-4 w-4" aria-hidden="true" />
              <span>Emergency Desk: {hospital?.emergencyPhone ?? '+91 44 4019 2911'}</span>
            </a>

            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setStartNodeId(NODE_IDS.L0_ENTRANCE);
                setEndNodeId(NODE_IDS.L0_EMERGENCY);
                setAccessibleOnly(true);
                navigate(
                  `/navigate?start=${encodeURIComponent(NODE_IDS.L0_ENTRANCE)}&dest=${encodeURIComponent(NODE_IDS.L0_EMERGENCY)}&accessible=true`,
                );
              }}
            >
              <Compass className="h-4 w-4" aria-hidden="true" />
              <span>Show Path from Lobby to ER</span>
            </Button>
          </div>
        </div>

        <div className="border-t border-champagne-border lg:col-span-5 lg:border-l lg:border-t-0">
          <img
            src={erMedia.src}
            alt={tf(erMedia.alt, erMedia.altTa)}
            width={erMedia.width}
            height={erMedia.height}
            className="h-full min-h-[240px] w-full object-cover"
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: '1. Ground Entry Ramp (L0-AMB)',
            body: 'Step-free ambulance and private car drop-off opens straight into Resuscitation & Rapid Triage (G-ER).',
          },
          {
            title: '2. Direct CT & Scan Lift (Level 1)',
            body: 'Dedicated wide path connects Trauma Bays to Central Elevators leading straight to Level 1 CT & 3T MRI.',
          },
          {
            title: '3. Staff-Escorted ICU Transfer (Level 3)',
            body: 'Priority clinical elevator routing connects directly to the Level 3 Intensive Care Unit.',
          },
        ].map((step) => (
          <div key={step.title} className="rounded-architectural border border-champagne-border bg-surface p-6">
            <h2 className="font-display text-base font-semibold text-ink">{step.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link to="/assistance"><Button variant="outline">Request Urgent Escort</Button></Link>
        <Link to="/navigate"><Button variant="ghost">Open Full 3D Map</Button></Link>
      </div>
    </div>
  );
}

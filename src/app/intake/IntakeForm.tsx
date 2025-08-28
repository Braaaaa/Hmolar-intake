'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import {
  CountryEnum,
  GenderEnum,
  type IntakeFormData,
  IntakeSchema,
  RelationEnum,
} from '@/lib/validation/intake';

export default function IntakeForm() {
  /**
   * Intake form rendered as a client component.
   * Uses react-hook-form with Zod for validation and next-intl for i18n.
   */
  const t = useTranslations('intake');

  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [serverMsgType, setServerMsgType] = useState<'success' | 'error' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const alertRef = useRef<HTMLDivElement | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
    getValues,
  } = useForm<IntakeFormData>({
    resolver: zodResolver(IntakeSchema),
    defaultValues: {
      residentType: 'resident',
      gender: 'other',
      address: {
        street: '',
        number: '',
        city: '',
        country: 'Bonaire',
        countryOther: '',
        postalCode: '',
      },
      phone1: { number: '', hasWhatsApp: true },
      phone2: { number: '' },
      email: '',
      emergencyContact: { name: '', relation: 'overig', phone: '' },
      medical: {
        heightCm: '',
        weightKg: '',
        medicationsSelected: [],
        medicationDetails: { bloedverdunners: '', diabetesmedicatie: '', anders: '' },
        allergiesSelected: [],
        allergyDetails: { anders: '' },
        conditions: {
          hartziekte: false,
          hogeBloeddruk: false,
          diabetes: false,
          bloedingsstoornis: false,
          schildklier: false,
          epilepsie: false,
          astma: false,
          nierOfLever: false,
          kunstgewricht: false,
          endocarditisProfylaxe: false,
          zwangerschap: false,
        },
        smokingStatus: 'nooit',
        alcoholPerWeek: '0',
        lastDentalVisit: 'onbekend',
        brushingFreq: '2x/dag',
        flossingFreq: 'soms',
        dentalAnxiety: 'mild',
        complicationsBefore: 'nee',
        complicationsDetails: '',
      },
      marketingConsent: false,
      privacyConsent: false,
    },
    mode: 'onBlur',
  });

  // Safely read a nested `message` string without using `any`.
  function getErrMsg(node: unknown): string | undefined {
    if (!node || typeof node !== 'object') return undefined;
    if ('message' in node) {
      const msg = (node as { message?: unknown }).message;
      return typeof msg === 'string' ? msg : undefined;
    }
    return undefined;
  }

  const residentType = useWatch({ control, name: 'residentType' });
  const selectedCountry = useWatch({ control, name: 'address.country' });
  const medsSelected = (useWatch({ control, name: 'medical.medicationsSelected' }) ||
    []) as IntakeFormData['medical']['medicationsSelected'];
  const allergiesSelected = (useWatch({ control, name: 'medical.allergiesSelected' }) ||
    []) as IntakeFormData['medical']['allergiesSelected'];
  const complicationsBefore = useWatch({ control, name: 'medical.complicationsBefore' });

  useEffect(() => {
    if (residentType === 'resident') {
      setValue('address.postalCode', '');
      setValue('address.country', 'Bonaire');
      setValue('address.countryOther', '');
    } else {
      setValue('address.country', getValues('address.country') || 'Nederland');
    }
  }, [residentType, setValue, getValues]);

  const genderOptions = useMemo(
    () =>
      GenderEnum.options.map((g) => (
        <option key={g} value={g}>
          {t(`options.gender.${g}`)}
        </option>
      )),
    [t],
  );

  const relationOptions = useMemo(
    () =>
      RelationEnum.options.map((r) => (
        <option key={r} value={r}>
          {t(`options.relation.${r}`)}
        </option>
      )),
    [t],
  );

  const countryOptions = useMemo(
    () =>
      CountryEnum.options.map((c) => (
        <option key={c} value={c}>
          {t(`options.country.${c}`)}
        </option>
      )),
    [t],
  );

  type MedOpt = IntakeFormData['medical']['medicationsSelected'][number];
  type AllergyOpt = IntakeFormData['medical']['allergiesSelected'][number];

  /**
   * Toggle a value in a react-hook-form array field.
   * Ensures mutual exclusivity for the special option 'geen' (none).
   */
  const toggleArray = (
    field: 'medical.medicationsSelected' | 'medical.allergiesSelected',
    value: MedOpt | AllergyOpt,
  ) => {
    const current = (getValues(field) as (MedOpt | AllergyOpt)[]) || [];
    const isOn = current.includes(value);
    let next = isOn ? current.filter((v) => v !== value) : [...current, value];

    if (value === 'geen' && !isOn) {
      next = ['geen'] as typeof next;
    } else if (value !== 'geen') {
      next = next.filter((v) => v !== 'geen') as typeof next;
    }

    if (field === 'medical.medicationsSelected') {
      setValue(field, next as MedOpt[], { shouldValidate: true, shouldDirty: true });
    } else {
      setValue(field, next as AllergyOpt[], { shouldValidate: true, shouldDirty: true });
    }
  };

  const onSubmit = async (values: IntakeFormData) => {
    setSubmitting(true);
    setServerMsg(null);
    setServerMsgType(null);
    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || `Server error (${res.status})`);
      }

      setServerMsg(t('server.success'));
      setServerMsgType('success');
      // Reset the form without relying on DOM events
      reset();
    } catch (err: unknown) {
      setServerMsg(t('server.error'));
      setServerMsgType('error');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-dismiss server message after ~8 seconds
  useEffect(() => {
    if (!serverMsg) return;
    const id = setTimeout(() => {
      setServerMsg(null);
      setServerMsgType(null);
    }, 8000);
    return () => clearTimeout(id);
  }, [serverMsg]);

  // Smooth scroll to the alert when it appears
  useEffect(() => {
    if (!serverMsg) return;
    const el = alertRef.current;
    if (!el) return;
    // Wait for layout, then scroll
    const id = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [serverMsg]);

  const ErrorText = ({ msg }: { msg?: string }) =>
    msg ? <p className="mt-1 text-sm text-red-600">{msg}</p> : null;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="space-y-4">
      <h2 className="text-lg font-medium">{title}</h2>
      {children}
    </section>
  );

  // Strictly typed condition keys used to render checkboxes.
  const conditionEntries: Array<[keyof IntakeFormData['medical']['conditions'], string]> = [
    ['hartziekte', t('cond.hartziekte')],
    ['hogeBloeddruk', t('cond.hogeBloeddruk')],
    ['diabetes', t('cond.diabetes')],
    ['bloedingsstoornis', t('cond.bloedingsstoornis')],
    ['schildklier', t('cond.schildklier')],
    ['epilepsie', t('cond.epilepsie')],
    ['astma', t('cond.astma')],
    ['nierOfLever', t('cond.nierOfLever')],
    ['kunstgewricht', t('cond.kunstgewricht')],
    ['endocarditisProfylaxe', t('cond.endocarditisProfylaxe')],
    ['zwangerschap', t('cond.zwangerschap')],
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      {serverMsg && (
        <div
          ref={alertRef}
          role="status"
          aria-live="polite"
          className={
            'relative rounded-md border p-3 pr-9 text-sm ' +
            (serverMsgType === 'success'
              ? 'border-green-300 bg-green-50 text-green-800'
              : 'border-red-300 bg-red-50 text-red-800')
          }
        >
          {serverMsg}
          <button
            type="button"
            aria-label={t('buttons.close')}
            onClick={() => {
              setServerMsg(null);
              setServerMsgType(null);
            }}
            className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-black/20"
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      )}

      {/* Spam honeypot (hidden field) */}
      <div className="hidden" aria-hidden="true">
        <label className="block text-sm font-medium">{t('honeypot')}</label>
        <input
          type="text"
          autoComplete="off"
          {...register('botField')}
          className="mt-1 w-full rounded-md border p-2"
        />
      </div>

      {/* Residence */}
      <Section title={t('sections.residence')}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">{t('labels.residentType')}</label>
            <select {...register('residentType')} className="mt-1 w-full rounded-md border p-2">
              <option value="resident">{t('options.residentType.resident')}</option>
              <option value="tourist">{t('options.residentType.tourist')}</option>
            </select>
            <ErrorText msg={errors.residentType?.message} />
          </div>
        </div>
      </Section>

      {/* Personal details */}
      <Section title={t('sections.person')}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">{t('labels.firstName')}</label>
            <input
              type="text"
              {...register('firstName')}
              className="mt-1 w-full rounded-md border p-2"
            />
            <ErrorText msg={errors.firstName?.message} />
          </div>
          <div>
            <label className="block text-sm font-medium">{t('labels.lastName')}</label>
            <input
              type="text"
              {...register('lastName')}
              className="mt-1 w-full rounded-md border p-2"
            />
            <ErrorText msg={errors.lastName?.message} />
          </div>
          <div>
            <label className="block text-sm font-medium">{t('labels.gender')}</label>
            <select {...register('gender')} className="mt-1 w-full rounded-md border p-2">
              {genderOptions}
            </select>
            <ErrorText msg={errors.gender?.message} />
          </div>
          <div>
            <label className="block text-sm font-medium">{t('labels.dateOfBirth')}</label>
            <input
              type="date"
              {...register('dateOfBirth')}
              className="mt-1 w-full rounded-md border p-2"
            />
            <ErrorText msg={errors.dateOfBirth?.message} />
          </div>
        </div>
      </Section>

      {/* Address & contact */}
      <Section title={t('sections.addressContact')}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">{t('labels.street')}</label>
            <input
              type="text"
              {...register('address.street')}
              className="mt-1 w-full rounded-md border p-2"
            />
            <ErrorText msg={errors.address?.street?.message} />
          </div>
          <div>
            <label className="block text-sm font-medium">{t('labels.number')}</label>
            <input
              type="text"
              {...register('address.number')}
              className="mt-1 w-full rounded-md border p-2"
            />
            <ErrorText msg={errors.address?.number?.message} />
          </div>
          <div>
            <label className="block text-sm font-medium">{t('labels.city')}</label>
            <input
              type="text"
              {...register('address.city')}
              className="mt-1 w-full rounded-md border p-2"
            />
            <ErrorText msg={errors.address?.city?.message} />
          </div>

          {residentType === 'tourist' && (
            <>
              <div>
                <label className="block text-sm font-medium">{t('labels.postalCode')}</label>
                <input
                  type="text"
                  {...register('address.postalCode')}
                  className="mt-1 w-full rounded-md border p-2"
                />
                <ErrorText msg={errors.address?.postalCode?.message} />
              </div>
              <div>
                <label className="block text-sm font-medium">{t('labels.country')}</label>
                <select
                  {...register('address.country')}
                  className="mt-1 w-full rounded-md border p-2"
                >
                  {countryOptions}
                </select>
                <ErrorText msg={errors.address?.country?.message} />
              </div>

              {selectedCountry === 'Overig' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">{t('labels.countryOther')}</label>
                  <input
                    type="text"
                    {...register('address.countryOther')}
                    className="mt-1 w-full rounded-md border p-2"
                  />
                  <ErrorText msg={errors.address?.countryOther?.message} />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium">{t('labels.phone1')}</label>
            <input
              type="tel"
              {...register('phone1.number')}
              className="mt-1 w-full rounded-md border p-2"
              inputMode="tel"
            />
            <ErrorText msg={errors.phone1?.number?.message} />
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('phone1.hasWhatsApp')} />
              <span>{t('labels.hasWhatsApp')}</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium">{t('labels.phone2')}</label>
            <input
              type="tel"
              {...register('phone2.number')}
              className="mt-1 w-full rounded-md border p-2"
              inputMode="tel"
            />
            <ErrorText msg={errors.phone2?.number?.message} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium">{t('labels.email')}</label>
            <input
              type="email"
              {...register('email')}
              className="mt-1 w-full rounded-md border p-2"
              inputMode="email"
            />
            <ErrorText msg={errors.email?.message} />
          </div>
        </div>
      </Section>

      {/* Emergency contact */}
      <Section title={t('sections.emergency')}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium">{t('labels.emergencyName')}</label>
            <input
              type="text"
              {...register('emergencyContact.name')}
              className="mt-1 w-full rounded-md border p-2"
            />
            <ErrorText msg={errors.emergencyContact?.name?.message} />
          </div>
          <div>
            <label className="block text-sm font-medium">{t('labels.emergencyRelation')}</label>
            <select
              {...register('emergencyContact.relation')}
              className="mt-1 w-full rounded-md border p-2"
            >
              {relationOptions}
            </select>
            <ErrorText msg={errors.emergencyContact?.relation?.message} />
          </div>
          <div>
            <label className="block text-sm font-medium">{t('labels.emergencyPhone')}</label>
            <input
              type="tel"
              {...register('emergencyContact.phone')}
              className="mt-1 w-full rounded-md border p-2"
              inputMode="tel"
            />
            <ErrorText msg={errors.emergencyContact?.phone?.message} />
          </div>
        </div>
      </Section>

      {/* Residency-specific (Bonaire) */}
      {residentType === 'resident' && (
        <Section title={t('sections.bonaireSpecific')}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">{t('labels.sedulaNumber')}</label>
              <input
                type="text"
                {...register('sedulaNumber')}
                className="mt-1 w-full rounded-md border p-2"
                placeholder="1234-567-890"
              />
              <ErrorText msg={errors.sedulaNumber?.message} />
            </div>
            <div>
              <label className="block text-sm font-medium">{t('labels.primaryPhysician')}</label>
              <input
                type="text"
                {...register('primaryPhysician')}
                className="mt-1 w-full rounded-md border p-2"
              />
              <ErrorText msg={errors.primaryPhysician?.message} />
            </div>
          </div>
        </Section>
      )}

      {/* Medical history */}
      <Section title={t('sections.medical')}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium">{t('labels.height')}</label>
            <input
              type="text"
              {...register('medical.heightCm')}
              className="mt-1 w-full rounded-md border p-2"
              placeholder="175"
            />
            <ErrorText msg={errors.medical?.heightCm?.message} />
          </div>
          <div>
            <label className="block text-sm font-medium">{t('labels.weight')}</label>
            <input
              type="text"
              {...register('medical.weightKg')}
              className="mt-1 w-full rounded-md border p-2"
              placeholder="70"
            />
            <ErrorText msg={errors.medical?.weightKg?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium">{t('labels.lastDentalVisit')}</label>
            <select
              {...register('medical.lastDentalVisit')}
              className="mt-1 w-full rounded-md border p-2"
            >
              <option value="<6m">{t('options.lastDentalVisit.lt6m')}</option>
              <option value="6-12m">{t('options.lastDentalVisit.6to12m')}</option>
              <option value="1-2j">{t('options.lastDentalVisit.1to2y')}</option>
              <option value="2-5j">{t('options.lastDentalVisit.2to5y')}</option>
              <option value=">5j">{t('options.lastDentalVisit.gt5y')}</option>
              <option value="onbekend">{t('options.lastDentalVisit.unknown')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">{t('labels.brushingFreq')}</label>
            <select
              {...register('medical.brushingFreq')}
              className="mt-1 w-full rounded-md border p-2"
            >
              <option value="1x/dag">{t('options.brushingFreq.1')}</option>
              <option value="2x/dag">{t('options.brushingFreq.2')}</option>
              <option value="≥3x/dag">{t('options.brushingFreq.3')}</option>
              <option value="minder">{t('options.brushingFreq.less')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">{t('labels.flossingFreq')}</label>
            <select
              {...register('medical.flossingFreq')}
              className="mt-1 w-full rounded-md border p-2"
            >
              <option value="dagelijks">{t('options.flossingFreq.daily')}</option>
              <option value="soms">{t('options.flossingFreq.sometimes')}</option>
              <option value="nooit">{t('options.flossingFreq.never')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">{t('labels.dentalAnxiety')}</label>
            <select
              {...register('medical.dentalAnxiety')}
              className="mt-1 w-full rounded-md border p-2"
            >
              <option value="geen">{t('options.dentalAnxiety.none')}</option>
              <option value="mild">{t('options.dentalAnxiety.mild')}</option>
              <option value="matig">{t('options.dentalAnxiety.moderate')}</option>
              <option value="ernstig">{t('options.dentalAnxiety.severe')}</option>
            </select>
          </div>

          {/* Medications */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium">{t('labels.medications')}</label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  'geen',
                  'bloedverdunners',
                  'diabetesmedicatie',
                  'antihypertensiva',
                  'antidepressiva',
                  'anders',
                ] as const
              ).map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={medsSelected.includes(opt)}
                    onChange={() => toggleArray('medical.medicationsSelected', opt)}
                  />
                  <span>{t(`options.medications.${opt}`)}</span>
                </label>
              ))}
            </div>
            <ErrorText msg={getErrMsg(errors.medical?.medicationsSelected)} />
          </div>

          {/* Medication details (shown when applicable) */}
          {medsSelected.includes('bloedverdunners') && (
            <div className="md:col-span-3">
              <label className="block text-sm font-medium">{t('labels.med_bloedverdunners')}</label>
              <input
                type="text"
                {...register('medical.medicationDetails.bloedverdunners')}
                className="mt-1 w-full rounded-md border p-2"
                placeholder={t('placeholders.med_bloedverdunners')}
              />
              <ErrorText msg={getErrMsg(errors.medical?.medicationDetails?.bloedverdunners)} />
            </div>
          )}
          {medsSelected.includes('diabetesmedicatie') && (
            <div className="md:col-span-3">
              <label className="block text-sm font-medium">{t('labels.med_diabetes')}</label>
              <input
                type="text"
                {...register('medical.medicationDetails.diabetesmedicatie')}
                className="mt-1 w-full rounded-md border p-2"
                placeholder={t('placeholders.med_diabetes')}
              />
              <ErrorText msg={getErrMsg(errors.medical?.medicationDetails?.diabetesmedicatie)} />
            </div>
          )}
          {medsSelected.includes('anders') && (
            <div className="md:col-span-3">
              <label className="block text-sm font-medium">{t('labels.med_other')}</label>
              <input
                type="text"
                {...register('medical.medicationDetails.anders')}
                className="mt-1 w-full rounded-md border p-2"
                placeholder={t('placeholders.med_other')}
              />
              <ErrorText msg={getErrMsg(errors.medical?.medicationDetails?.anders)} />
            </div>
          )}

          {/* Allergies */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium">{t('labels.allergies')}</label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                ['geen', 'penicilline', 'lokale_verdoving', 'latex', 'nikkel', 'anders'] as const
              ).map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={allergiesSelected.includes(opt)}
                    onChange={() => toggleArray('medical.allergiesSelected', opt)}
                  />
                  <span>{t(`options.allergies.${opt}`)}</span>
                </label>
              ))}
            </div>
            <ErrorText msg={getErrMsg(errors.medical?.allergiesSelected)} />
          </div>

          {allergiesSelected.includes('anders') && (
            <div className="md:col-span-3">
              <label className="block text-sm font-medium">{t('labels.allergy_other')}</label>
              <input
                type="text"
                {...register('medical.allergyDetails.anders')}
                className="mt-1 w-full rounded-md border p-2"
              />
              <ErrorText msg={getErrMsg(errors.medical?.allergyDetails?.anders)} />
            </div>
          )}

          {/* Conditions */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium">{t('labels.conditions')}</label>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {conditionEntries.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register(`medical.conditions.${key}` as const)} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">{t('labels.complicationsBefore')}</label>
            <select
              {...register('medical.complicationsBefore')}
              className="mt-1 w-full rounded-md border p-2"
            >
              <option value="nee">{t('options.no')}</option>
              <option value="ja">{t('options.yes')}</option>
            </select>
            <ErrorText msg={errors.medical?.complicationsBefore?.message} />
          </div>

          {complicationsBefore === 'ja' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">
                {t('labels.complicationsDetails')}
              </label>
              <input
                type="text"
                {...register('medical.complicationsDetails')}
                className="mt-1 w-full rounded-md border p-2"
              />
              <ErrorText msg={errors.medical?.complicationsDetails?.message} />
            </div>
          )}
        </div>
      </Section>

      {/* Consents */}
      <Section title={t('sections.consents')}>
        <label className="flex items-start gap-3">
          <input type="checkbox" {...register('marketingConsent')} className="mt-1" />
          <span className="text-sm">{t('labels.marketingConsent')}</span>
        </label>

        <label className="flex items-start gap-3">
          <input type="checkbox" {...register('privacyConsent')} className="mt-1" />
          <span className="text-sm">
            {t('labels.privacyConsent')}{' '}
            <a href="#" className="underline">
              {t('labels.privacyPolicy')}
            </a>
            .
          </span>
        </label>
        <ErrorText msg={errors.privacyConsent?.message} />
      </Section>

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {submitting ? t('buttons.submitting') : t('buttons.submit')}
      </button>
    </form>
  );
}

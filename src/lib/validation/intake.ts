import { z } from 'zod';

// Helpers & enums
const phoneRegex = /^\+?[\d\s-()]{7,20}$/;
const sedulaRegex = /^[0-9]{9}$/;

export const ResidentTypeEnum = z.enum(['resident', 'tourist']);
export const GenderEnum = z.enum(['male', 'female', 'other', 'prefer_not_to_say']);
export const RelationEnum = z.enum([
  'partner',
  'ouder',
  'kind',
  'familie',
  'vriend',
  'collega',
  'overig',
]);

export const CountryEnum = z.enum([
  'Bonaire',
  'Curaçao',
  'Aruba',
  'Nederland',
  'VS',
  'België',
  'Duitsland',
  'Colombia',
  'Venezuela',
  'Overig',
]);

const MedicationOptionEnum = z.enum([
  'geen',
  'bloedverdunners',
  'diabetesmedicatie',
  'antihypertensiva',
  'antidepressiva',
  'anders',
]);

const AllergyOptionEnum = z.enum([
  'geen',
  'penicilline',
  'lokale_verdoving',
  'latex',
  'nikkel',
  'anders',
]);

export const MedicalHistorySchema = z
  .object({
    heightCm: z.coerce
      .number({ invalid_type_error: 'Vul een getal in' })
      .int()
      .positive()
      .min(50, 'Te klein')
      .max(250, 'Te groot')
      .optional(),
    weightKg: z.coerce
      .number({ invalid_type_error: 'Vul een getal in' })
      .int()
      .positive()
      .min(20, 'Te licht')
      .max(300, 'Te zwaar')
      .optional(),

    medicationsSelected: z.array(MedicationOptionEnum).default([]),
    medicationDetails: z.object({
      bloedverdunners: z.string().optional(),
      diabetesmedicatie: z.string().optional(),
      anders: z.string().optional(),
    }),

    allergiesSelected: z.array(AllergyOptionEnum).default([]),
    allergyDetails: z.object({
      anders: z.string().optional(),
    }),

    lastDentalVisit: z
      .enum(['<6m', '6-12m', '1-2j', '2-5j', '>5j', 'onbekend'])
      .default('onbekend'),
    brushingFreq: z.enum(['1x/dag', '2x/dag', '≥3x/dag', 'minder']).default('2x/dag'),
    flossingFreq: z.enum(['dagelijks', 'soms', 'nooit']).default('soms'),
    dentalAnxiety: z.enum(['geen', 'mild', 'matig', 'ernstig']).default('mild'),

    conditions: z.object({
      hartziekte: z.boolean().default(false),
      hogeBloeddruk: z.boolean().default(false),
      diabetes: z.boolean().default(false),
      bloedingsstoornis: z.boolean().default(false),
      schildklier: z.boolean().default(false),
      epilepsie: z.boolean().default(false),
      astma: z.boolean().default(false),
      nierOfLever: z.boolean().default(false),
      kunstgewricht: z.boolean().default(false),
      endocarditisProfylaxe: z.boolean().default(false),
      zwangerschap: z.boolean().default(false),
    }),

    smokingStatus: z.enum(['nooit', 'gestopt', 'soms', 'dagelijks']).default('nooit'),
    alcoholPerWeek: z.enum(['0', '1-3', '4-7', '8+']).default('0'),

    complicationsBefore: z.enum(['nee', 'ja']).default('nee'),
    complicationsDetails: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.medicationsSelected.includes('geen') && val.medicationsSelected.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "'Geen' kan niet gecombineerd worden",
        path: ['medicationsSelected'],
      });
    }
    if (
      val.medicationsSelected.includes('bloedverdunners') &&
      !val.medicationDetails.bloedverdunners?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Specificeer welke bloedverdunners',
        path: ['medicationDetails', 'bloedverdunners'],
      });
    }
    if (
      val.medicationsSelected.includes('diabetesmedicatie') &&
      !val.medicationDetails.diabetesmedicatie?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Specificeer welke diabetesmedicatie',
        path: ['medicationDetails', 'diabetesmedicatie'],
      });
    }
    if (val.medicationsSelected.includes('anders') && !val.medicationDetails.anders?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Specificeer andere medicatie',
        path: ['medicationDetails', 'anders'],
      });
    }

    if (val.allergiesSelected.includes('geen') && val.allergiesSelected.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "'Geen' kan niet gecombineerd worden",
        path: ['allergiesSelected'],
      });
    }
    if (val.allergiesSelected.includes('anders') && !val.allergyDetails.anders?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Specificeer andere allergie',
        path: ['allergyDetails', 'anders'],
      });
    }

    if (val.complicationsBefore === 'ja' && !val.complicationsDetails?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Licht complicaties toe',
        path: ['complicationsDetails'],
      });
    }
  });

export const IntakeSchema = z
  .object({
    residentType: ResidentTypeEnum,

    firstName: z.string().min(2, 'Minimaal 2 letters'),
    lastName: z.string().min(2, 'Minimaal 2 letters'),
    gender: GenderEnum.default('other'),
    dateOfBirth: z.string().refine((val) => {
      const d = new Date(val);
      const now = new Date();
      return !Number.isNaN(d.getTime()) && d <= now;
    }, 'Geboortedatum is ongeldig of in de toekomst'),

    address: z.object({
      street: z.string().min(2, 'Verplicht'),
      number: z.string().min(1, 'Verplicht'),
      city: z.string().min(2, 'Verplicht'),
      postalCode: z.string().optional(),
      country: CountryEnum.optional(),
      countryOther: z.string().optional(),
    }),

    phone1: z.object({
      number: z.string().regex(phoneRegex, 'Ongeldig telefoonnummer'),
      hasWhatsApp: z.boolean().default(true),
    }),
    phone2: z
      .object({
        number: z.string().regex(phoneRegex, 'Ongeldig telefoonnummer'),
      })
      .partial()
      .optional(),

    email: z.string().email('Ongeldig e-mailadres'),

    emergencyContact: z.object({
      name: z.string().min(2, 'Verplicht'),
      relation: RelationEnum.default('overig'),
      phone: z.string().regex(phoneRegex, 'Ongeldig telefoonnummer'),
    }),

    sedulaNumber: z.string().regex(sedulaRegex, 'Ongeldig sedula-nummer').optional(),
    primaryPhysician: z.string().min(2, 'Verplicht').optional(),

    medical: MedicalHistorySchema,

    marketingConsent: z.boolean().default(false),

    // Belangrijk: als boolean laten voor TypeScript, met refine==true voor runtime validatie
    privacyConsent: z
      .boolean()
      .refine((v) => v === true, { message: 'Je moet akkoord gaan met de privacyverklaring' }),

    botField: z.string().max(0).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.residentType === 'resident') {
      if (!val.sedulaNumber?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Sedula-nummer is verplicht',
          path: ['sedulaNumber'],
        });
      }
      if (!val.primaryPhysician?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Huisarts is verplicht',
          path: ['primaryPhysician'],
        });
      }
    }

    if (val.residentType === 'tourist') {
      if (!val.address.postalCode?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Postcode is verplicht',
          path: ['address', 'postalCode'],
        });
      }
      if (!val.address.country) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Land is verplicht',
          path: ['address', 'country'],
        });
      } else if (val.address.country === 'Overig' && !val.address.countryOther?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Vul het land in',
          path: ['address', 'countryOther'],
        });
      }
    }
  });

export type IntakeFormData = z.infer<typeof IntakeSchema>;

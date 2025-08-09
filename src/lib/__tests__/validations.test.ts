import { describe, test, expect } from '@jest/globals'
import {
  passwordSchema,
  signupSchema,
  signinSchema,
  profileUpdateSchema,
  projectCreateSchema,
  projectUpdateSchema,
  applicationCreateSchema,
  applicationUpdateSchema,
  idSchema,
  paginationSchema,
  searchSchema,
} from '../validations'

describe('Validation Schemas', () => {
  describe('passwordSchema', () => {
    test('should accept valid passwords', () => {
      const validPasswords = [
        'Password123!',
        'MySecure@Pass1',
        'Complex$Password99',
        'StrongPass123&',
      ]

      validPasswords.forEach(password => {
        expect(passwordSchema.safeParse(password).success).toBe(true)
      })
    })

    test('should reject passwords that are too short', () => {
      const result = passwordSchema.safeParse('Pass1!')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password must be at least 8 characters long')
      }
    })

    test('should reject passwords that are too long', () => {
      const longPassword = 'a'.repeat(129) + 'A1!'
      const result = passwordSchema.safeParse(longPassword)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password must be less than 128 characters long')
      }
    })

    test('should reject passwords without lowercase letters', () => {
      const result = passwordSchema.safeParse('PASSWORD123!')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password must contain at least one lowercase letter')
      }
    })

    test('should reject passwords without uppercase letters', () => {
      const result = passwordSchema.safeParse('password123!')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password must contain at least one uppercase letter')
      }
    })

    test('should reject passwords without numbers', () => {
      const result = passwordSchema.safeParse('Password!')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password must contain at least one number')
      }
    })

    test('should reject passwords without special characters', () => {
      const result = passwordSchema.safeParse('Password123')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Password must contain at least one special character (@$!%*?&)')
      }
    })
  })

  describe('signupSchema', () => {
    const validSignupData = {
      name: 'John Doe',
      username: 'johndoe',
      email: 'john@example.com',
      password: 'Password123!',
    }

    test('should accept valid signup data', () => {
      const result = signupSchema.safeParse(validSignupData)
      expect(result.success).toBe(true)
    })

    test('should reject invalid email', () => {
      const result = signupSchema.safeParse({
        ...validSignupData,
        email: 'invalid-email',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid email address')
      }
    })

    test('should reject name that is too short', () => {
      const result = signupSchema.safeParse({
        ...validSignupData,
        name: 'A',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name must be at least 2 characters long')
      }
    })

    test('should reject name that is too long', () => {
      const result = signupSchema.safeParse({
        ...validSignupData,
        name: 'A'.repeat(51),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name must be less than 50 characters long')
      }
    })

    test('should reject name with invalid characters', () => {
      const result = signupSchema.safeParse({
        ...validSignupData,
        name: 'John123',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Name can only contain letters and spaces')
      }
    })
  })

  describe('profileUpdateSchema', () => {
    test('should accept valid profile update data', () => {
      const validData = {
        name: 'Jane Doe',
        bio: 'Software engineer passionate about AI',
        specialty: 'AI' as const,
        experienceLevel: 'SENIOR' as const,
        skills: ['JavaScript', 'Python', 'React'],
        linkedinUrl: 'https://linkedin.com/in/janedoe',
        githubUrl: 'https://github.com/janedoe',
        portfolioUrl: 'https://janedoe.com',
        availability: 'Available weekends',
        timezone: 'UTC-5',
      }

      const result = profileUpdateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should accept empty strings for URL fields', () => {
      const result = profileUpdateSchema.safeParse({
        linkedinUrl: '',
        githubUrl: '',
        portfolioUrl: '',
      })
      expect(result.success).toBe(true)
    })

    test('should reject invalid LinkedIn URL', () => {
      const result = profileUpdateSchema.safeParse({
        linkedinUrl: 'https://facebook.com/profile',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Must be a valid LinkedIn profile URL')
      }
    })

    test('should reject invalid GitHub URL', () => {
      const result = profileUpdateSchema.safeParse({
        githubUrl: 'https://gitlab.com/user',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Must be a valid GitHub profile URL')
      }
    })

    test('should reject bio that is too long', () => {
      const result = profileUpdateSchema.safeParse({
        bio: 'A'.repeat(1001),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Bio must be less than 1000 characters long')
      }
    })

    test('should reject too many skills', () => {
      const result = profileUpdateSchema.safeParse({
        skills: Array(21).fill('skill'),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Maximum 20 skills allowed')
      }
    })
  })

  describe('projectCreateSchema', () => {
    const validProjectData = {
      name: 'AI-Powered Learning Platform',
      goal: 'Create personalized AI-driven educational experiences',
      description: 'A comprehensive learning platform that uses AI to personalize education for students worldwide.',
      helpType: 'MVP' as const,
      contactEmail: 'contact@example.com',
      webpage: 'https://example.com',
      planOutline: 'Phase 1: Design, Phase 2: Development, Phase 3: Testing',
      history: 'Started as a research project at university',
      targetCompletionDate: '2024-12-31T23:59:59.000Z',
    }

    test('should accept valid project data', () => {
      const result = projectCreateSchema.safeParse(validProjectData)
      expect(result.success).toBe(true)
    })

    test('should reject name that is too short', () => {
      const result = projectCreateSchema.safeParse({
        ...validProjectData,
        name: 'AI',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Project name must be at least 3 characters long')
      }
    })

    test('should reject description that is too short', () => {
      const result = projectCreateSchema.safeParse({
        ...validProjectData,
        description: 'Short description',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Description must be at least 50 characters long')
      }
    })

    test('should reject goal that is too short', () => {
      const result = projectCreateSchema.safeParse({
        ...validProjectData,
        goal: 'Short',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Project goal must be at least 10 characters long')
      }
    })

    test('should reject invalid help type', () => {
      const result = projectCreateSchema.safeParse({
        ...validProjectData,
        helpType: 'INVALID' as any,
      })
      expect(result.success).toBe(false)
    })

    test('should reject invalid contact email', () => {
      const result = projectCreateSchema.safeParse({
        ...validProjectData,
        contactEmail: 'invalid-email',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid contact email address')
      }
    })
  })

  describe('applicationCreateSchema', () => {
    test('should accept valid volunteer application data', () => {
      const validData = {
        message: 'I am interested in volunteering for this project with my React and Node.js skills.',
      }

      const result = applicationCreateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should reject message that is too short', () => {
      const result = applicationCreateSchema.safeParse({
        message: 'Too short',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Application message must be at least 10 characters long')
      }
    })

    test('should reject message that is too long', () => {
      const result = applicationCreateSchema.safeParse({
        message: 'A'.repeat(2001),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Application message must be less than 2000 characters long')
      }
    })
  })

  describe('applicationUpdateSchema', () => {
    test('should accept valid volunteer application update data', () => {
      const validData = {
        status: 'ACCEPTED' as const,
        message: 'Welcome to the team!',
      }

      const result = applicationUpdateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should reject invalid status', () => {
      const result = applicationUpdateSchema.safeParse({
        status: 'INVALID' as any,
      })
      expect(result.success).toBe(false)
    })

    test('should reject response message that is too long', () => {
      const result = applicationUpdateSchema.safeParse({
        status: 'ACCEPTED' as const,
        message: 'A'.repeat(1001),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Response message must be less than 1000 characters long')
      }
    })
  })

  describe('idSchema', () => {
    test('should accept valid CUID', () => {
      const validCuid = 'cljk1234567890abcdef'
      const result = idSchema.safeParse(validCuid)
      expect(result.success).toBe(true)
    })

    test('should reject invalid ID format', () => {
      const result = idSchema.safeParse('invalid-id')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toBe('Invalid ID format')
      }
    })
  })

  describe('paginationSchema', () => {
    test('should accept valid pagination data', () => {
      const result = paginationSchema.safeParse({
        page: 2,
        limit: 20,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ page: 2, limit: 20 })
      }
    })

    test('should use default values', () => {
      const result = paginationSchema.safeParse({})
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({ page: 1, limit: 10 })
      }
    })

    test('should reject invalid page number', () => {
      const result = paginationSchema.safeParse({
        page: 0,
      })
      expect(result.success).toBe(false)
    })

    test('should reject limit that is too high', () => {
      const result = paginationSchema.safeParse({
        limit: 101,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('searchSchema', () => {
    test('should accept valid search data', () => {
      const validData = {
        query: 'AI machine learning',
        projectType: 'STARTUP' as const,
        helpType: 'MVP' as const,
        skills: ['React', 'Python'],
      }

      const result = searchSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should accept empty search data', () => {
      const result = searchSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    test('should reject query that is too long', () => {
      const result = searchSchema.safeParse({
        query: 'A'.repeat(256),
      })
      expect(result.success).toBe(false)
    })
  })
})
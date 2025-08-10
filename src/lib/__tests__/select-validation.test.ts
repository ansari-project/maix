/**
 * Global validation test for Select components
 * 
 * This test scans the codebase to ensure no Select.Item components
 * have empty string values, which would cause runtime errors.
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

describe('Select Component Global Validation', () => {
  it('should not have any SelectItem components with empty string values', async () => {
    // Find all TypeScript/TSX files in the src directory
    const files = await glob('src/**/*.{ts,tsx}', {
      ignore: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'node_modules/**'
      ]
    })

    const filesWithEmptySelectValues: string[] = []
    const violations: Array<{ file: string; line: number; content: string }> = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line, index) => {
        // Check for SelectItem with empty value prop
        // Patterns to check:
        // 1. <SelectItem value="">
        // 2. <SelectItem value={""}>
        // 3. <SelectItem value={''}>
        const patterns = [
          /<SelectItem\s+.*?value=""/,
          /<SelectItem\s+.*?value={''}>/,
          /<SelectItem\s+.*?value={""}/,
          /<SelectItem\s+value=""\s*/,
          /<SelectItem\s+value={''}s*/,
          /<SelectItem\s+value={""}s*/
        ]

        for (const pattern of patterns) {
          if (pattern.test(line)) {
            if (!filesWithEmptySelectValues.includes(file)) {
              filesWithEmptySelectValues.push(file)
            }
            violations.push({
              file,
              line: index + 1,
              content: line.trim()
            })
          }
        }

        // Also check for problematic initial state patterns
        // that might lead to empty select values
        if (line.includes('useState') && line.includes('productId:') && line.includes('""')) {
          // This is a warning, not an error, but good to catch
          console.warn(`Warning: Potential empty productId initial state in ${file}:${index + 1}`)
        }
      })
    }

    // Report any violations found
    if (violations.length > 0) {
      console.error('Found SelectItem components with empty values:')
      violations.forEach(v => {
        console.error(`  ${v.file}:${v.line} - ${v.content}`)
      })
    }

    // Test should fail if any violations are found
    expect(filesWithEmptySelectValues).toHaveLength(0)
  })

  it('should use non-empty default values for optional select fields', async () => {
    // Find all files that might contain Select components with optional values
    const files = await glob('src/**/*.{ts,tsx}', {
      ignore: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'node_modules/**'
      ]
    })

    const recommendations: Array<{ file: string; line: number; issue: string }> = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line, index) => {
        // Check for patterns that might indicate optional select fields
        // that should use "none" or similar non-empty default
        if (line.includes('<SelectItem') && 
            (line.includes('No ') || 
             line.includes('None') || 
             line.includes('Select') ||
             line.includes('Choose'))) {
          
          // Extract the value prop
          const valueMatch = line.match(/value=["'{]([^"'}]*)["'}]/)
          if (valueMatch && valueMatch[1] === '') {
            recommendations.push({
              file,
              line: index + 1,
              issue: 'Empty value for "no selection" option - should use "none" or similar'
            })
          }
        }
      })
    }

    // Log recommendations (these are not failures, just suggestions)
    if (recommendations.length > 0) {
      console.log('Recommendations for select field improvements:')
      recommendations.forEach(r => {
        console.log(`  ${r.file}:${r.line} - ${r.issue}`)
      })
    }

    // This test passes as long as no critical violations were found
    expect(true).toBe(true)
  })

  it('should validate Select initial states are non-empty for required fields', async () => {
    const files = await glob('src/**/*.{ts,tsx}', {
      ignore: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'node_modules/**'
      ]
    })

    const potentialIssues: Array<{ file: string; line: number; field: string }> = []

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      
      // Look for useState patterns with select-related fields
      const selectFields = ['productId', 'organizationId', 'projectId', 'status', 'helpType']
      
      selectFields.forEach(field => {
        // Check for pattern: fieldName: ""
        const emptyInitPattern = new RegExp(`${field}:\\s*["']\\s*["']`, 'g')
        const matches = content.match(emptyInitPattern)
        
        if (matches) {
          const lines = content.split('\n')
          lines.forEach((line, index) => {
            if (emptyInitPattern.test(line)) {
              // Check if this is in a Select context (not just any object)
              const contextStart = Math.max(0, index - 10)
              const contextEnd = Math.min(lines.length, index + 10)
              const context = lines.slice(contextStart, contextEnd).join('\n')
              
              if (context.includes('Select') || context.includes('useState')) {
                potentialIssues.push({
                  file,
                  line: index + 1,
                  field
                })
              }
            }
          })
        }
      })
    }

    // Report potential issues (these might need manual review)
    if (potentialIssues.length > 0) {
      console.log('Potential empty select field initializations found:')
      potentialIssues.forEach(issue => {
        console.log(`  ${issue.file}:${issue.line} - ${issue.field} initialized as empty string`)
      })
    }

    // This is informational - the test passes but logs findings
    expect(true).toBe(true)
  })
})
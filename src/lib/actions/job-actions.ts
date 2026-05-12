// src/lib/actions/job-actions.ts
'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function batchJobAction(formData: FormData) {
  const action = formData.get('action') as string
  const jobIds = formData.getAll('jobIds') as string[]

  if (jobIds.length === 0) return

  const serviceClient = createServiceClient()
  if (!serviceClient) return

  if (action === 'publish') {
    await serviceClient
      .from('jobs')
      .update({ is_published: true, status: 'published' })
      .in('id', jobIds)
  } else if (action === 'unpublish') {
    await serviceClient
      .from('jobs')
      .update({ is_published: false, status: 'draft' })
      .in('id', jobIds)
  } else if (action === 'delete') {
    await serviceClient
      .from('jobs')
      .delete()
      .in('id', jobIds)
  } else if (action === 'assign_consultant') {
    const consultantId = formData.get('consultant_id') as string
    if (consultantId) {
      await serviceClient
        .from('jobs')
        .update({ consultant_id: consultantId })
        .in('id', jobIds)
    }
  }

  revalidatePath('/consultant/jobs')
}

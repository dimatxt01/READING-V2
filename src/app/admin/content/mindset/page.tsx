'use client'

import { useState, useEffect, useCallback } from 'react'
// import { createClient } from '@/lib/supabase/client' // TODO: Add when implementing mindset content management
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { 
  Brain, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Save
} from 'lucide-react'

interface MindsetContent {
  id: string
  title: string
  section: string
  content: string
  order_index: number
  is_active: boolean
  version: number
  created_at: string
  updated_at: string
}

export default function MindsetContentEditor() {
  const [contents, setContents] = useState<MindsetContent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const [editingContent, setEditingContent] = useState<MindsetContent | null>(null)
  const [previewContent, setPreviewContent] = useState<MindsetContent | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    section: '',
    content: '',
    order_index: 0,
    is_active: true
  })

  // const supabase = createClient() // TODO: Add mindset content management

  // Default mindset content structure
  const defaultSections = [
    'introduction',
    'science-behind-reading',
    'automaticity-principle',
    'vocabulary-growth',
    'neuroplasticity',
    'practical-tips',
    'conclusion'
  ]

  const sectionTitles = {
    'introduction': 'Introduction',
    'science-behind-reading': 'The Science Behind Reading',
    'automaticity-principle': 'Automaticity Principle',
    'vocabulary-growth': 'Vocabulary Growth',
    'neuroplasticity': 'Neuroplasticity',
    'practical-tips': 'Practical Tips',
    'conclusion': 'Conclusion'
  }

  const fetchMindsetContent = useCallback(async () => {
    setLoading(true)
    try {
      // Just use default content for now since table doesn't exist in types
      await createDefaultContent()
    } catch (error) {
      console.error('Error loading mindset content:', error)
      toast.error('Failed to load mindset content')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMindsetContent()
  }, [fetchMindsetContent])

  const createDefaultContent = async () => {
    const defaultContent = [
      {
        title: 'The Most Important Principle: Just Read More',
        section: 'introduction',
        content: `This isn't an exercise; it's the foundation of all reading improvement. The most scientifically-backed way to boost your reading speed, comprehension, and memory is simple: read consistently.

People who say &quot;speed reading didn't work&quot; often tried a few exercises but missed this crucial step. Here's the science behind why volume is the key.`,
        order_index: 0,
        is_active: true
      },
      {
        title: 'You Get Faster, Automatically',
        section: 'automaticity-principle',
        content: `The more you see a word, the faster your brain recognizes it. This process, called automaticity, becomes effortless. It frees up your mental energy to focus on understanding big ideas instead of just decoding individual words.

Research shows that frequent exposure to words creates neural pathways that allow for instant recognition. This is why avid readers naturally read faster than occasional readers.`,
        order_index: 1,
        is_active: true
      },
      {
        title: 'You Understand More, Effortlessly',
        section: 'vocabulary-growth',
        content: `Reading is the best way to grow your vocabulary, and a larger vocabulary is directly linked to better comprehension. You also build a library of background knowledge in your mind, which helps you grasp new topics much faster.

Studies indicate that readers encounter 2-3 times more vocabulary through reading than through conversation, making it the most effective way to expand linguistic knowledge.`,
        order_index: 2,
        is_active: true
      },
      {
        title: 'You Remember Better, Scientifically',
        section: 'neuroplasticity',
        content: `Consistent reading physically changes your brain. This process, known as neuroplasticity, strengthens the neural pathways for language and memory. The more you read, the more efficient your brain becomes at storing what you've learned.

Brain imaging studies show that regular readers have increased connectivity in areas associated with language processing, comprehension, and memory formation.`,
        order_index: 3,
        is_active: true
      },
      {
        title: 'The Takeaway',
        section: 'conclusion',
        content: `The exercises in this app are powerful tools. But they are most effective when combined with the fundamental habit of consistent reading. Submit your pages daily to build the most important skill of all.

Remember: There's no substitute for volume. The more you read, the better you become at reading. It's that simple.`,
        order_index: 4,
        is_active: true
      }
    ]

    try {
      // Set default content for preview mode since table may not exist
      setContents(defaultContent.map((item, index) => ({
        id: `default-${index}`,
        ...item,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })))
      toast.info('Preview mode: Default content loaded')
    } catch (error) {
      console.error('Error creating default content:', error)
      toast.error('Failed to load content')
    }
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.content || !formData.section) {
      toast.error('Please fill in all required fields')
      return
    }

    // Just simulate success for preview mode
    toast.info('Preview mode: Changes not saved to database')
    setShowCreateDialog(false)
    setEditingContent(null)
    setFormData({
      title: '',
      section: '',
      content: '',
      order_index: 0,
      is_active: true
    })
  }

  const handleEdit = (content: MindsetContent) => {
    setEditingContent(content)
    setFormData({
      title: content.title,
      section: content.section,
      content: content.content,
      order_index: content.order_index,
      is_active: content.is_active
    })
    setShowCreateDialog(true)
  }

  const handleDelete = async (/* contentId: string */) => { // TODO: Implement delete functionality
    if (!confirm('Are you sure you want to delete this content section?')) return
    toast.info('Preview mode: Changes not saved to database')
  }

  const toggleActive = async (/* content: MindsetContent */) => { // TODO: Implement toggle functionality
    toast.info('Preview mode: Changes not saved to database')
  }

  const previewFullContent = () => {
    const activeContents = contents
      .filter(c => c.is_active)
      .sort((a, b) => a.order_index - b.order_index)
    
    const fullContent = {
      id: 'preview',
      title: 'Just Read More - Complete Exercise',
      section: 'full',
      content: activeContents.map(c => `## ${c.title}\n\n${c.content}`).join('\n\n'),
      order_index: 0,
      is_active: true,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    setPreviewContent(fullContent)
    setShowPreviewDialog(true)
  }

  const getSectionBadgeColor = (section: string) => {
    const colors = {
      'introduction': 'bg-blue-500',
      'science-behind-reading': 'bg-green-500',
      'automaticity-principle': 'bg-purple-500',
      'vocabulary-growth': 'bg-orange-500',
      'neuroplasticity': 'bg-red-500',
      'practical-tips': 'bg-yellow-500',
      'conclusion': 'bg-gray-500'
    }
    return colors[section as keyof typeof colors] || 'bg-gray-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mindset Content Editor</h1>
          <p className="text-muted-foreground">
            Manage the content for the &quot;Just Read More&quot; mindset exercise
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={previewFullContent}>
            <Eye className="h-4 w-4 mr-2" />
            Preview Exercise
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList>
          <TabsTrigger value="content">Content Management</TabsTrigger>
          <TabsTrigger value="preview">Exercise Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          {/* Content Sections */}
          <div className="grid gap-4">
            {loading ? (
              <div>Loading content...</div>
            ) : contents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No content sections yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create content sections for the mindset exercise
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Section
                  </Button>
                </CardContent>
              </Card>
            ) : (
              contents
                .sort((a, b) => a.order_index - b.order_index)
                .map((content) => (
                  <Card key={content.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg">{content.title}</CardTitle>
                            <Badge className={getSectionBadgeColor(content.section)}>
                              {sectionTitles[content.section as keyof typeof sectionTitles] || content.section}
                            </Badge>
                            {!content.is_active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <CardDescription>
                            Order: {content.order_index} • Version: {content.version} • 
                            Updated: {new Date(content.updated_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleActive()}
                          >
                            {content.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(content)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete()}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {content.content}
                      </p>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exercise Preview</CardTitle>
              <CardDescription>
                This is how users will see the mindset exercise
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                {contents
                  .filter(c => c.is_active)
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((content) => (
                    <div key={content.id} className="mb-6">
                      <h3 className="text-xl font-semibold mb-3">{content.title}</h3>
                      <div className="whitespace-pre-wrap text-gray-700">
                        {content.content}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContent ? 'Edit Content Section' : 'Add Content Section'}
            </DialogTitle>
            <DialogDescription>
              Create or edit a section of the mindset exercise content
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Section title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="section">Section</Label>
                <select
                  id="section"
                  value={formData.section}
                  onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select section</option>
                  {defaultSections.map((section) => (
                    <option key={section} value={section}>
                      {sectionTitles[section as keyof typeof sectionTitles]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="order_index">Order Index</Label>
                <Input
                  id="order_index"
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write the content for this section..."
                className="min-h-[200px] resize-y"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="is_active">Active (visible to users)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="h-4 w-4 mr-2" />
              {editingContent ? 'Update Section' : 'Add Section'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewContent?.title}</DialogTitle>
            <DialogDescription>
              Full exercise preview as users will see it
            </DialogDescription>
          </DialogHeader>
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap">{previewContent?.content}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
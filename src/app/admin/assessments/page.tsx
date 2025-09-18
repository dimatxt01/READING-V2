'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/components/ui/use-toast'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { 
  Plus,
  Edit2,
  Trash2,
  Eye,
  Search,
  BookOpen,
  Users,
  BarChart3,
  Loader2,
  Copy,
  CheckCircle2,
  HelpCircle
} from 'lucide-react'
import { AssessmentText } from '@/lib/types/database-extensions'

interface AssessmentFormData {
  title: string
  content: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  category: string
  active: boolean
  questions: Array<{
    question: string
  }>
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<AssessmentText[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentText | null>(null)
  const [formData, setFormData] = useState<AssessmentFormData>({
    title: '',
    content: '',
    difficulty_level: 'intermediate',
    category: '',
    active: true,
    questions: []
  })
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const fetchAssessments = useCallback(async () => {
    setLoading(true)
    try {
      const adminClient = createAdminClient()
      const { data, error } = await adminClient
        .from('assessment_texts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAssessments(data || [])
    } catch (error) {
      console.error('Error fetching assessments:', error)
      toast({
        title: 'Error',
        description: 'Failed to load assessments',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchAssessments()
  }, [fetchAssessments])

  const calculateWordCount = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0
  }

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: 'Error',
        description: 'Title and text content are required',
        variant: 'destructive'
      })
      return
    }

    if (formData.questions.length === 0) {
      toast({
        title: 'Error',
        description: 'At least one comprehension question is required',
        variant: 'destructive'
      })
      return
    }

    // Validate questions have all required fields
    for (let i = 0; i < formData.questions.length; i++) {
      const question = formData.questions[i]
      if (!question.question.trim()) {
        toast({
          title: 'Error',
          description: `Question ${i + 1}: Question text is required`,
          variant: 'destructive'
        })
        return
      }
    }

    setSubmitting(true)
    try {
      const adminClient = createAdminClient()
      const word_count = calculateWordCount(formData.content)

      if (selectedAssessment) {
        // Update existing assessment
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (adminClient as any)
          .from('assessment_texts')
          .update({
            ...formData,
            word_count,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedAssessment.id)

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Assessment updated successfully'
        })
        setIsEditOpen(false)
      } else {
        // Create new assessment
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (adminClient as any)
          .from('assessment_texts')
          .insert({
            ...formData,
            word_count,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })

        if (error) throw error

        toast({
          title: 'Success',
          description: 'Assessment created successfully'
        })
        setIsCreateOpen(false)
      }

      fetchAssessments()
      resetForm()
    } catch (error) {
      console.error('Error saving assessment:', error)
      toast({
        title: 'Error',
        description: 'Failed to save assessment',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (assessment: AssessmentText) => {
    setSelectedAssessment(assessment)
    setFormData({
      title: assessment.title || '',
      content: assessment.content,
      difficulty_level: assessment.difficulty_level as 'beginner' | 'intermediate' | 'advanced' || 'intermediate',
      category: assessment.category || '',
      active: assessment.active ?? true,
      questions: Array.isArray(assessment.questions) ? assessment.questions as Array<{question: string, options: string[], correct_answer: string}> : []
    })
    setIsEditOpen(true)
  }

  const handleDelete = async (assessment: AssessmentText) => {
    try {
      const adminClient = createAdminClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (adminClient as any)
        .from('assessment_texts')
        .delete()
        .eq('id', assessment.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Assessment deleted successfully'
      })
      fetchAssessments()
    } catch (error) {
      console.error('Error deleting assessment:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete assessment',
        variant: 'destructive'
      })
    }
  }

  const handleToggleStatus = async (assessment: AssessmentText) => {
    try {
      const adminClient = createAdminClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (adminClient as any)
        .from('assessment_texts')
        .update({
          active: !(assessment.active ?? true),
          updated_at: new Date().toISOString()
        })
        .eq('id', assessment.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: `Assessment ${!(assessment.active ?? true) ? 'activated' : 'deactivated'} successfully`
      })
      fetchAssessments()
    } catch (error) {
      console.error('Error toggling assessment status:', error)
      toast({
        title: 'Error',
        description: 'Failed to update assessment status',
        variant: 'destructive'
      })
    }
  }

  const handlePreview = (assessment: AssessmentText) => {
    setSelectedAssessment(assessment)
    setIsPreviewOpen(true)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Copied',
        description: 'Text copied to clipboard'
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy text',
        variant: 'destructive'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      difficulty_level: 'intermediate',
      category: '',
      active: true,
      questions: []
    })
    setSelectedAssessment(null)
  }

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        { question: '' }
      ]
    })
  }

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index)
    })
  }

  const updateQuestion = (index: number, field: string, value: string) => {
    const newQuestions = [...formData.questions]
    newQuestions[index] = { ...newQuestions[index], [field]: value }
    setFormData({ ...formData, questions: newQuestions })
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch = !searchQuery || 
      assessment.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assessment.content.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesDifficulty = difficultyFilter === 'all' || assessment.difficulty_level === difficultyFilter
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && (assessment.active ?? true)) ||
      (statusFilter === 'inactive' && !(assessment.active ?? true))

    return matchesSearch && matchesDifficulty && matchesStatus
  })

  const activeCount = assessments.filter(a => a.active ?? true).length
  const totalWordCount = assessments.reduce((sum, a) => sum + (a.word_count || 0), 0)
  const avgWordCount = assessments.length > 0 ? Math.round(totalWordCount / assessments.length) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assessment Management</h1>
          <p className="text-muted-foreground">
            Manage reading assessment texts and comprehension materials
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Create Assessment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Assessment</DialogTitle>
              <DialogDescription>
                Add a new reading assessment text with comprehension questions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter assessment title..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty Level</Label>
                <Select 
                  value={formData.difficulty_level} 
                  onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => 
                    setFormData({ ...formData, difficulty_level: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Enter category (e.g., Fiction, Science, History)..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text_content">Text Content</Label>
                <Textarea
                  id="text_content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter the assessment text content..."
                  rows={8}
                />
                <p className="text-sm text-muted-foreground">
                  Word count: {calculateWordCount(formData.content)}
                </p>
              </div>
              
              {/* Questions Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Comprehension Questions</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>
                
                {formData.questions.map((question, questionIndex) => (
                  <div key={questionIndex} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium">Question {questionIndex + 1}</span>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeQuestion(questionIndex)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Textarea
                      placeholder="Enter your question..."
                      value={question.question}
                      onChange={(e) => updateQuestion(questionIndex, 'question', e.target.value)}
                      rows={2}
                    />
                    
                    <div className="space-y-2">
                      <Label className="text-sm">Question Details</Label>
                      <p className="text-sm text-muted-foreground">
                        This is a text-based comprehension question. Users will provide written answers that will be evaluated by AI.
                      </p>
                    </div>
                  </div>
                ))}
                
                {formData.questions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <HelpCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>No questions added yet. Click &quot;Add Question&quot; to get started.</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Assessment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assessments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Assessments</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Words</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWordCount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Word Count</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgWordCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assessments List */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Texts</CardTitle>
          <CardDescription>
            Manage reading assessment texts and view their usage statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || difficultyFilter !== 'all' || statusFilter !== 'all' 
                  ? 'No assessments match your filters' 
                  : 'No assessments found. Create your first assessment to get started.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">
                        {assessment.title || 'Untitled Assessment'}
                      </h4>
                      <Badge className={getDifficultyColor(assessment.difficulty_level || 'intermediate')}>
                        {assessment.difficulty_level || 'intermediate'}
                      </Badge>
                      <Badge variant={(assessment.active ?? true) ? 'default' : 'secondary'}>
                        {(assessment.active ?? true) ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {assessment.content.substring(0, 150)}...
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{assessment.word_count || 0} words</span>
                      <span>Created {assessment.created_at ? new Date(assessment.created_at).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={assessment.active ?? true}
                      onCheckedChange={() => handleToggleStatus(assessment)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(assessment)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(assessment)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Assessment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete &ldquo;{assessment.title}&rdquo;? 
                            This action cannot be undone and will also delete all associated questions.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(assessment)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Assessment</DialogTitle>
            <DialogDescription>
              Update the assessment text and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter assessment title..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-difficulty">Difficulty Level</Label>
              <Select 
                value={formData.difficulty_level} 
                onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => 
                  setFormData({ ...formData, difficulty_level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Input
                id="edit-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Enter category (e.g., Fiction, Science, History)..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-text">Text Content</Label>
              <Textarea
                id="edit-text"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter the assessment text content..."
                rows={8}
              />
              <p className="text-sm text-muted-foreground">
                Word count: {calculateWordCount(formData.content)}
              </p>
            </div>
            
            {/* Questions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Comprehension Questions</Label>
                <Button type="button" variant="outline" size="sm" onClick={addQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
              
              {formData.questions.map((question, questionIndex) => (
                <div key={questionIndex} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-sm font-medium">Question {questionIndex + 1}</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeQuestion(questionIndex)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Textarea
                    placeholder="Enter your question..."
                    value={question.question}
                    onChange={(e) => updateQuestion(questionIndex, 'question', e.target.value)}
                    rows={2}
                  />
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Question Details</Label>
                    <p className="text-sm text-muted-foreground">
                      This is a text-based comprehension question. Users will provide written answers that will be evaluated by AI.
                    </p>
                  </div>
                </div>
              ))}
              
              {formData.questions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <HelpCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>No questions added yet. Click &quot;Add Question&quot; to get started.</p>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Preview: {selectedAssessment?.title || 'Untitled Assessment'}
              <Badge className={getDifficultyColor(selectedAssessment?.difficulty_level || 'intermediate')}>
                {selectedAssessment?.difficulty_level || 'intermediate'}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedAssessment?.word_count || 0} words • Created {selectedAssessment?.created_at ? new Date(selectedAssessment.created_at).toLocaleDateString() : 'N/A'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Assessment Text</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedAssessment && copyToClipboard(selectedAssessment.content)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Text
                </Button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {selectedAssessment?.content}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              if (selectedAssessment) {
                handleEdit(selectedAssessment)
                setIsPreviewOpen(false)
              }
            }}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
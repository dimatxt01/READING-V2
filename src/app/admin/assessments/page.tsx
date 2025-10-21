'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import {
  FileText,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Calendar,
  BookOpen,
  Loader2,
  Download,
  Hash
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'

interface Assessment {
  id: string
  title: string
  content: string
  word_count: number
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  category: string | null
  created_at: string
  updated_at: string
  is_active: boolean
}

export default function AdminAssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newAssessment, setNewAssessment] = useState({
    title: '',
    content: '',
    difficulty_level: 'intermediate' as 'beginner' | 'intermediate' | 'advanced',
    category: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const itemsPerPage = 10

  useEffect(() => {
    fetchAssessments()
  }, [])

  const fetchAssessments = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/assessments')
      if (!response.ok) throw new Error('Failed to fetch assessments')
      const data = await response.json()
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
  }

  const handleCreateAssessment = async () => {
    if (!newAssessment.title || !newAssessment.content) {
      toast({
        title: 'Error',
        description: 'Title and content are required',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssessment)
      })

      if (!response.ok) throw new Error('Failed to create assessment')

      toast({
        title: 'Success',
        description: 'Assessment created successfully'
      })

      setShowCreateDialog(false)
      setNewAssessment({
        title: '',
        content: '',
        difficulty_level: 'intermediate',
        category: ''
      })
      fetchAssessments()
    } catch (error) {
      console.error('Error creating assessment:', error)
      toast({
        title: 'Error',
        description: 'Failed to create assessment',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAssessment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assessment?')) return

    try {
      const response = await fetch(`/api/admin/assessments?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete assessment')

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

  // Filtering and sorting
  const filteredAssessments = assessments.filter(assessment => {
    const matchesSearch =
      assessment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assessment.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDifficulty = difficultyFilter === 'all' || assessment.difficulty_level === difficultyFilter
    return matchesSearch && matchesDifficulty
  })

  const sortedAssessments = [...filteredAssessments].sort((a, b) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aValue: any = a[sortBy as keyof Assessment]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bValue: any = b[sortBy as keyof Assessment]

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    }
    return aValue < bValue ? 1 : -1
  })

  // Pagination
  const totalPages = Math.ceil(sortedAssessments.length / itemsPerPage)
  const paginatedAssessments = sortedAssessments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assessment Texts</h1>
          <p className="text-muted-foreground">
            Manage assessment texts for reading comprehension tests
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Assessment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Assessment</DialogTitle>
              <DialogDescription>
                Add a new assessment text for reading comprehension tests
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newAssessment.title}
                  onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })}
                  placeholder="Assessment title"
                />
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={newAssessment.content}
                  onChange={(e) => setNewAssessment({ ...newAssessment, content: e.target.value })}
                  placeholder="Assessment text content"
                  className="h-48"
                />
                {newAssessment.content && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Word count: {newAssessment.content.trim().split(/\s+/).length}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select
                    value={newAssessment.difficulty_level}
                    onValueChange={(value) => setNewAssessment({
                      ...newAssessment,
                      difficulty_level: value as 'beginner' | 'intermediate' | 'advanced'
                    })}
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

                <div>
                  <Label htmlFor="category">Category (optional)</Label>
                  <Input
                    id="category"
                    value={newAssessment.category}
                    onChange={(e) => setNewAssessment({ ...newAssessment, category: e.target.value })}
                    placeholder="e.g., Science, History"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAssessment} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Assessment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search assessments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[300px]"
                />
              </div>

              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All difficulties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All difficulties</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <FileText className="h-3 w-3 mr-1" />
                {assessments.length} total
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Word Count</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAssessments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No assessments found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAssessments.map((assessment) => (
                  <TableRow key={assessment.id}>
                    <TableCell>
                      <div className="font-medium">{assessment.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {assessment.content.substring(0, 100)}...
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Hash className="h-3 w-3 mr-1 text-muted-foreground" />
                        {assessment.word_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDifficultyColor(assessment.difficulty_level)}>
                        {assessment.difficulty_level}
                      </Badge>
                    </TableCell>
                    <TableCell>{assessment.category || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                        {format(new Date(assessment.created_at), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={assessment.is_active ? 'default' : 'secondary'}>
                        {assessment.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDeleteAssessment(assessment.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
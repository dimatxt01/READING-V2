'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { 
  Plus, 
  Upload,
  Download,
  Trash2,
  Search,
  Filter,
  Zap,
  Hash,
  FileText,
  Settings
} from 'lucide-react'

// Default word categories - can be customized by admins
const DEFAULT_CATEGORIES = {
  starter: {
    name: 'Starter Pack',
    description: 'Essential words to get started',
    difficulty: 'beginner',
    words: ['start', 'read', 'fast', 'learn', 'practice']
  }
}

interface WordCategory {
  id: string
  name: string
  description: string
  difficulty: string
  words: string[]
  created_at?: string
  updated_at?: string
}

export default function WordFlasherLibraryPage() {
  const [categories, setCategories] = useState<WordCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  
  // Form state
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    difficulty: 'intermediate'
  })
  
  const [wordInput, setWordInput] = useState('')
  const [bulkWords, setBulkWords] = useState('')
  
  const { toast } = useToast()

  useEffect(() => {
    // Load categories from localStorage (in production, this would be from database)
    loadCategories()
  }, [])

  const loadCategories = () => {
    const stored = localStorage.getItem('wordFlasherCategories')
    if (stored) {
      setCategories(JSON.parse(stored))
    } else {
      // Start with empty categories - admins can create their own
      setCategories([])
    }
  }

  const saveCategories = (cats: WordCategory[]) => {
    localStorage.setItem('wordFlasherCategories', JSON.stringify(cats))
  }

  const createCategory = () => {
    if (!categoryForm.name) {
      toast({
        title: 'Error',
        description: 'Category name is required',
        variant: 'destructive'
      })
      return
    }

    const newCategory: WordCategory = {
      id: Date.now().toString(),
      name: categoryForm.name,
      description: categoryForm.description,
      difficulty: categoryForm.difficulty,
      words: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const updated = [...categories, newCategory]
    setCategories(updated)
    saveCategories(updated)
    
    toast({
      title: 'Success',
      description: 'Category created successfully'
    })

    setCategoryForm({
      name: '',
      description: '',
      difficulty: 'intermediate'
    })
    setSelectedCategory(newCategory.id)
  }

  const deleteCategory = (id: string) => {
    const updated = categories.filter(cat => cat.id !== id)
    setCategories(updated)
    saveCategories(updated)
    
    if (selectedCategory === id) {
      setSelectedCategory('')
    }
    
    toast({
      title: 'Success',
      description: 'Category deleted successfully'
    })
  }

  const addWord = () => {
    if (!selectedCategory || !wordInput.trim()) return

    const updated = categories.map(cat => {
      if (cat.id === selectedCategory) {
        const newWords = [...cat.words]
        const word = wordInput.trim().toLowerCase()
        if (!newWords.includes(word)) {
          newWords.push(word)
          newWords.sort()
        }
        return { ...cat, words: newWords, updated_at: new Date().toISOString() }
      }
      return cat
    })

    setCategories(updated)
    saveCategories(updated)
    setWordInput('')
    
    toast({
      title: 'Success',
      description: 'Word added successfully'
    })
  }

  const addBulkWords = () => {
    if (!selectedCategory || !bulkWords.trim()) return

    const wordsToAdd = bulkWords
      .split(/[\s,;]+/)
      .map(w => w.trim().toLowerCase())
      .filter(Boolean)

    const updated = categories.map(cat => {
      if (cat.id === selectedCategory) {
        const existingWords = new Set(cat.words)
        wordsToAdd.forEach(word => existingWords.add(word))
        const newWords = Array.from(existingWords).sort()
        return { ...cat, words: newWords, updated_at: new Date().toISOString() }
      }
      return cat
    })

    setCategories(updated)
    saveCategories(updated)
    setBulkWords('')
    
    toast({
      title: 'Success',
      description: `Added ${wordsToAdd.length} words successfully`
    })
  }

  const removeWord = (categoryId: string, word: string) => {
    const updated = categories.map(cat => {
      if (cat.id === categoryId) {
        const newWords = cat.words.filter(w => w !== word)
        return { ...cat, words: newWords, updated_at: new Date().toISOString() }
      }
      return cat
    })

    setCategories(updated)
    saveCategories(updated)
    
    toast({
      title: 'Success',
      description: 'Word removed successfully'
    })
  }

  const exportCategory = (category: WordCategory) => {
    const data = JSON.stringify(category, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `word-flasher-${category.name.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importCategory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        const newCategory: WordCategory = {
          ...imported,
          id: Date.now().toString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        const updated = [...categories, newCategory]
        setCategories(updated)
        saveCategories(updated)
        
        toast({
          title: 'Success',
          description: 'Category imported successfully'
        })
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to import category',
          variant: 'destructive'
        })
      }
    }
    reader.readAsText(file)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         cat.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDifficulty = filterDifficulty === 'all' || cat.difficulty === filterDifficulty
    return matchesSearch && matchesDifficulty
  })

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Word Flasher Library</h1>
          <p className="text-muted-foreground">
            Manage word categories and vocabulary lists for the Word Flasher exercise
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".json"
            onChange={importCategory}
            className="hidden"
            id="import-file"
          />
          <Button
            variant="outline"
            onClick={() => document.getElementById('import-file')?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="words">Word Management</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-6">
          {/* Create Category Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="category-name">Name</Label>
                  <Input
                    id="category-name"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Category name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="category-description">Description</Label>
                  <Input
                    id="category-description"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description"
                  />
                </div>
                
                <div>
                  <Label htmlFor="category-difficulty">Difficulty</Label>
                  <Select 
                    value={categoryForm.difficulty} 
                    onValueChange={(value) => setCategoryForm(prev => ({ ...prev, difficulty: value }))}
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
                
                <div className="flex items-end">
                  <Button onClick={createCategory} className="w-full">
                    Create Category
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="filter-difficulty">Difficulty</Label>
                  <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Difficulties</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category List */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCategories.map(category => (
              <Card key={category.id} className={selectedCategory === category.id ? 'ring-2 ring-primary' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        {category.name}
                      </CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteCategory(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={getDifficultyColor(category.difficulty)}>
                      {category.difficulty}
                    </Badge>
                    
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      {category.words.length} words
                    </Badge>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      Manage Words
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportCategory(category)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="words" className="space-y-6">
          {selectedCategoryData ? (
            <>
              {/* Category Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      {selectedCategoryData.name}
                    </span>
                    <Badge className={getDifficultyColor(selectedCategoryData.difficulty)}>
                      {selectedCategoryData.difficulty}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {selectedCategoryData.description} • {selectedCategoryData.words.length} words
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Add Words */}
              <Card>
                <CardHeader>
                  <CardTitle>Add Words</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={wordInput}
                      onChange={(e) => setWordInput(e.target.value)}
                      placeholder="Enter a word"
                      onKeyPress={(e) => e.key === 'Enter' && addWord()}
                    />
                    <Button onClick={addWord}>Add Word</Button>
                  </div>

                  <div>
                    <Label htmlFor="bulk-words">Bulk Import (comma or space separated)</Label>
                    <Textarea
                      id="bulk-words"
                      value={bulkWords}
                      onChange={(e) => setBulkWords(e.target.value)}
                      placeholder="Enter multiple words separated by commas, spaces, or new lines"
                      className="mt-1"
                    />
                    <Button onClick={addBulkWords} className="mt-2">
                      Import Bulk Words
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Word List */}
              <Card>
                <CardHeader>
                  <CardTitle>Word List</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategoryData.words.map(word => (
                      <Badge
                        key={word}
                        variant="secondary"
                        className="px-3 py-1 flex items-center gap-1"
                      >
                        {word}
                        <button
                          onClick={() => removeWord(selectedCategoryData.id, word)}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  
                  {selectedCategoryData.words.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No words in this category yet
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Select a category to manage its words
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Word Flasher Settings
              </CardTitle>
              <CardDescription>
                Configure default settings for the Word Flasher exercise
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Default Flash Speed (milliseconds)</Label>
                <Input type="number" defaultValue="200" placeholder="200" />
                <p className="text-xs text-muted-foreground mt-1">
                  How long each word appears on screen by default
                </p>
              </div>

              <div>
                <Label>Words Per Session</Label>
                <Input type="number" defaultValue="15" placeholder="15" />
                <p className="text-xs text-muted-foreground mt-1">
                  Default number of words per training session
                </p>
              </div>

              <div>
                <Label>Accuracy Threshold (%)</Label>
                <Input type="number" defaultValue="75" placeholder="75" />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum accuracy required to level up
                </p>
              </div>

              <div>
                <Label>Speed Increase Factor</Label>
                <Input type="number" defaultValue="0.9" step="0.1" placeholder="0.9" />
                <p className="text-xs text-muted-foreground mt-1">
                  Multiplier for flash speed when leveling up (0.9 = 10% faster)
                </p>
              </div>

              <Button className="w-full">Save Settings</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const data = JSON.stringify(categories, null, 2)
                  const blob = new Blob([data], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = 'word-flasher-all-categories.json'
                  a.click()
                  URL.revokeObjectURL(url)
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export All Categories
              </Button>

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  if (confirm('Are you sure you want to reset to default categories? This will delete all custom categories.')) {
                    const defaultCats = Object.entries(DEFAULT_CATEGORIES).map(([key, cat]) => ({
                      id: key,
                      ...cat,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    }))
                    setCategories(defaultCats)
                    saveCategories(defaultCats)
                    toast({
                      title: 'Success',
                      description: 'Reset to default categories'
                    })
                  }
                }}
              >
                Reset to Defaults
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
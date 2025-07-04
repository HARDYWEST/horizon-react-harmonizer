import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Code2, Layout, MousePointer, List } from 'lucide-react';

interface ExampleSelectorProps {
  onSelectExample: (code: string) => void;
}

const examples = [
  {
    id: 'simple-component',
    title: 'Simple Component',
    description: 'Basic functional component with props',
    icon: Code2,
    code: `import React from 'react';

interface WelcomeProps {
  name: string;
  age?: number;
}

const Welcome = ({ name, age = 0 }: WelcomeProps) => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
      <h1>Hello, {name}!</h1>
      {age > 0 && <p>You are {age} years old.</p>}
    </div>
  );
};

export default Welcome;`
  },
  {
    id: 'stateful-component',
    title: 'Stateful Component',
    description: 'Component with useState and event handlers',
    icon: MousePointer,
    code: `import React, { useState } from 'react';

const Counter = () => {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');

  const increment = () => {
    setCount(count + 1);
  };

  const reset = () => {
    setCount(0);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Counter: {count}</h2>
      <button onClick={increment}>Increment</button>
      <button onClick={reset}>Reset</button>
      
      <input 
        type="text" 
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter your name"
      />
      {name && <p>Hello, {name}!</p>}
    </div>
  );
};

export default Counter;`
  },
  {
    id: 'list-component',
    title: 'List Component',
    description: 'Component with dynamic list rendering',
    icon: List,
    code: `import React, { useState } from 'react';

interface TodoItem {
  id: number;
  text: string;
  completed: boolean;
}

const TodoList = () => {
  const [todos, setTodos] = useState<TodoItem[]>([
    { id: 1, text: 'Learn React', completed: true },
    { id: 2, text: 'Learn Horizon UI', completed: false },
  ]);

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Todo List</h2>
      <ul>
        {todos.map(todo => (
          <li 
            key={todo.id}
            style={{ 
              textDecoration: todo.completed ? 'line-through' : 'none',
              cursor: 'pointer',
              padding: '5px'
            }}
            onClick={() => toggleTodo(todo.id)}
          >
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TodoList;`
  },
  {
    id: 'complex-layout',
    title: 'Complex Layout',
    description: 'Component with complex layout and styling',
    icon: Layout,
    code: `import React, { useState, useEffect } from 'react';

const Dashboard = () => {
  const [user, setUser] = useState({ name: 'John Doe', avatar: '/avatar.jpg' });
  const [stats, setStats] = useState({ views: 0, likes: 0 });

  useEffect(() => {
    // Simulate data fetch
    setStats({ views: 1234, likes: 567 });
  }, []);

  return (
    <div className="dashboard-container">
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '20px',
        borderBottom: '1px solid #eee'
      }}>
        <h1>Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src={user.avatar} 
            alt="User avatar"
            style={{ width: '40px', height: '40px', borderRadius: '50%' }}
          />
          <span>{user.name}</span>
        </div>
      </header>
      
      <main style={{ padding: '20px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '20px',
          marginBottom: '20px'
        }}>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px' 
          }}>
            <h3>Views</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.views}</p>
          </div>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px' 
          }}>
            <h3>Likes</h3>
            <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.likes}</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;`
  }
];

export const ExampleSelector = ({ onSelectExample }: ExampleSelectorProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Try an Example</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {examples.map((example) => (
          <Card 
            key={example.id}
            className="p-4 cursor-pointer transition-all duration-300 hover:shadow-converter border-border/50 hover:border-primary/30 bg-gradient-to-br from-card to-card/50"
            onClick={() => onSelectExample(example.code)}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <example.icon className="w-5 h-5 text-primary" />
                <h4 className="font-medium text-foreground">{example.title}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{example.description}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full transition-smooth hover:bg-primary hover:text-primary-foreground"
              >
                Load Example
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
---
title: 第二节 锁保护的数据结构
sidebar_position: 2
---

import OfficePreview from '@site/src/components/OfficePreview/index';

<OfficePreview place = "/ppt/3-16-ds-new.ppt"/>

## 第二节 锁保护的数据结构

> 今天我们仍然会考虑说并行程序对于共享数据的这个保护，但是锁是一种，另外一种场景就是我们不直接使用锁，因为我们写代码的时候，很多时候是围绕一些数据结构，我们基于这种数据结构来管理数据。另外的一个思路是我们去用锁去保护这些数据结构，让这些数据结构支持并发。所谓的支持并发就是可以由多个 thread 去访问这些数据结构，安全的访问这些数据结构。

### 一、概述

#### 1）基本想法

- 数据结构要支持并发，它本质上要支持对于数据结构的一些操作，对不对？那么这些操作比如说你是一个array，那我要支持对于 array 的读和写。
- 如果我是个 link list，我除了要去这个 look up 这些这个 link list 外，我还要增加insert，插入一些元素
- 所谓的支持并发的数据结构就是说这个数据结构的接口可以被多个线程安全的并发调用。
- 比如说我正在插入一个元素的时候，同时有另外一个线程在读，他们不会读到一半的数据。
- 这就是所谓的concurrent的数据结构
- 我们的锁采用上节课讲的Pthread

### 二、counter

> 这里我们介绍一个简单的counter的实现

#### 1）一个counter

- 我们考虑这样的一个简单的数据结构，就是一个简单的counter

```c
typedef struct __conter_t { 
   int value; 
   pthread_mutex_t lock;
} counter_t
```

- 初始化的时候元素的值设置为0。

```c

void init(counter *c) { 
   c->value=0; 
   pthread_mutex_init(&c->lock, NULL);
}

void increment(counter_t *c) { 
   Pthread_mutex_lock(&c->lock);
   c->value++; 
   Pthread_mutex_unlock(&c->lock);
}

void decrement(counter_t *c) { 
   Pthread_mutex_lock(&c->lock);
   c->value--; 
   Pthread_mutex_unlock(&c->lock); 
} 

int get(counter_t *c) {
   Pthread_mutex_lock(&c->lock);
   rc = c->value; 
   Pthread_mutex_unlock(&c->lock);
   return rc
} 
```

- 但是他的性能是如下图片所示，性能比较差。随着 spread 增加，它花掉的时间是一个线性增长，样的一个情况和我们的理想情况下是是不符合的，
- 怎么优化？注意如果一个数据结构不是特别慢，我们就不需要优化

![截屏2023-06-03 12.57.07](./2-locked-ds.assets/%E6%88%AA%E5%B1%8F2023-06-03%2012.57.07.png)

#### 2）Sloppy Counter

- 它采用的方式是用一个 global counter和很多的local counter
- 那么他的想法是每一个核（thread的数量可能超过核心的数量，核代表同时执行的线程的数量）我们可以设定每个核心上面的thread只去操作自己的counter
- 但是你如果要去读这个counter，你需要把所有的local的counter全部加起来，这种方法不太好。所以采用的方法是batch的方法提交。local counter攒到了一定的数量之后集中提交给global counter
- 当然也有个情况，就是你读到的这个结果可能不精确，所以这个sloppy counter。你可以选择可扩展的去读到一个不精确的值，或者比较慢的去读到一个精确的值。

下面我们来看具体的例子

- 假设有一个4核心的CPU的机器，我们设置四个local counter，然后一个global counter
- Scalable Write：实现可拓展的写，每一个local的counter都会绑定一把锁，每个线程增加local counter的值
- Scalable Read：实现可拓展的读，局部counter的值是周期性的转移到global的counter，当更新的时候会给global counter加锁，这样读取的时候读的值可能不太景气
- 我们需要设定一个阈值，Sloppiness，一旦local counter的数值超过了这个，就会触发更新操作。对于越大的阈值，更新不频繁，反之更新越频繁
- 精确的读取的时候，我们需要把所有的锁全部锁上，然后求和更新global counter的值
- 性能效果如下所示

![截屏2023-06-03 13.11.56](./2-locked-ds.assets/%E6%88%AA%E5%B1%8F2023-06-03%2013.11.56.png)

- 实现的代码如下所示

```c
typedef struct __counter_t {
  int             global        // global count
  pthread_mutex_t glock;        // global lock
  int             local[NCPUS]; // local counter (per cpu)
  pthread_mutex_t llock[NCPUS]; // ... and locks
  int             threshold;    // update frequency
} counter_t;

// init: record threshold, init locks, init values
//       if all local counts and global count
void init (counter_t *c, int threshold) {
   c->threshold = threshold;
   c->global = 0;
   pthread_mutex_init(&c->glock, NULL);
   int i;
   for (i = 0; I < NCPUS; i++) {
      c->local[i] = 0;
      pthread_mutex_init(c->llock[i], NULL);
   }
}

// update: usually, just grab local lock and update local 
//         amount once local count has risen by ‘threshold’,
//         grab global lock and transfer local values to it
void update (counter_t *c, int threadID, int amt) {
   int cpu = threadID % NCPUS;
   pthread_mutex_lock(&c->llock[cpu]);
   c->local[cpu] += amt;                // assumes amt > 0
   if (c->local[cpu] >= c->threshold) { // transfer
      pthread_mutex_lock(&c->glock);
      c->global += c->local[cpu];
      pthread_mutex_unlock(&c->glock);
      c->local[cpu] = 0;
   }
   pthread_mutex_unlock(&c->llock[cpu]);
}

// get: just return global amount (which may not be perfect)
int get (counter_t *c) {
   pthread_mutex_lock(&c->glock);
   int val = c->global;
   pthread_mutex_unlock(&c->glock);
   return val; // only approximate!
}


```

### 三、链表

> 这里我们介绍一个简单的链表的实现。要实现这个 concurrent 的数据结构最简单的方式是什么呢？你拿一把大的锁，然后所有的操作之前都拿锁，做完了之后都放锁，这个一定是一个正确的 concurrent 的 link list，但是这并不是真正的链表

#### 1）简易版

- 注意经过观察可以发现一些操作并不需要加锁
- 注意return前的时候需要释放锁

```c
typedef struct __node_t { // basic node structure
  int             key;
  struct __node_t *next;
} node_t;

typedef struct __list_t { // basic list structure
  node_t          *head;
  pthread_mutex_t lock;
} list_t

void List_Init(list_t *L) {
   L->head = NULL;
   pthread_mutex_init(&L->lock, NULL);
}


int List_Insert(list *L, int key) {
   pthread_mutex_lock(&L->lock);
   node_t *new = malloc(sizeof(node_t));
   if (new == NULL) {
      perror(“malloc”);
      pthread_mutex_unlock(&L->lock);
      return -1; // fail
   }
   new->key = key; 
   new->next = L->head; 
   L->head = new;
   pthread_mutex_unlock(&L->lock);
   return 0; // success
}

int List_Lookup(list *L, int key) {
   pthread_mutex_lock(&L->lock);
   node_t *curr = L->head;
   while (curr) {
      if (curr->key == key) {
         pthread_mutex_unlock(&L->lock);
         return 0; // success
      }
      curr = curr->next;
   }
   pthread_mutex_unlock(&L->lock);
   return -1; // failure
}

```

#### 2）复杂版

- 下面是 Scala scaling 的这个 link list。那么讲到这个扩展性的时候，我们第一个想到的就是把这些 lock 变成多个，为什么呢？因为如果你只有一个 global 的lock，所有的人都在这个锁上，就造成了它保护的所有地方都是 critical session，而且是个全局的 creative session
- 所以它所谓的可扩展的 link list，一般情况下就增加多把锁，就像前面的 counter 也是，我们有 local counter，有 local lock也有全局的锁。这样呢？你这个 look up 的人，他看的这条链的不同的地方和插入的地方，只要不在一块，他们是不是可以并行执行？所以感觉上你的并行性是会提高。
- 提高并行的情况就是让他们的锁不要冲突，更加精确的锁

我们可以考虑手递手的lock（也就是Hand-over-hand locking）

- 在每一个节点使用一个lock，而不是整个list用一个全局的lock
- 优先抓取下一个node的锁，然后释放当前节点的锁
- 但是会发现这种开销实在太大，全部都是加锁解锁。

### 四、队列

> 并发队列采用了两把锁，你会发现每个对象太细粒度的锁往往这个性能是不高的，队列的特点是先进先出。他希望的是入列和出列不要互相影响，但是你入列多个人都想入列，那你他们之间是要去抢这个位置的。如果你同时要出列，那么你也只能被一个人拿走，但是入列和出列这两个操作应该是不互相冲突的，因为入列是队伍头，出列是队伍尾巴。

- 注意极端情况下面，队列是空的时候，会出现header和tail是同一个位置。我们可以加一个空的节点。

```c
typedef struct __node_t { 
  int              key;
  struct __node_t *next;
} node_t;

typedef struct __queue_t {
  node_t          *head;
  node_t          *tail;
  pthread_mutex_t  head_lock;
  pthread_mutex_t  tail_lock;
} queue_t

void Queue_Init(queue_t *q) {
   node_t *tmp = malloc(sizeof(node_t));
   tmp->next = NULL;
   q->head = q->tail = temp;
   pthread_mutex_init(&q->head_lock, NULL);
   pthread_mutex_init(&q->tail_lock, NULL);
}

// 入队的时候
void Queue_Enqueu(queue_t *q, int value) {
   node_t *tmp = malloc(sizeof(node_t));
   assert(tmp != NULL);
   tmp->value = value;
   tmp->next = NULL;

   pthread_mutex_lock(&q->tail_lock);
   q->tail->next = tmp;
   q->tail = tmp;
   pthread_mutex_unlock(&->tail_lock);
}

// 
void Queue_Dequeu(queue_t *q, int value) {
   pthread_mutex_lock(&q->head_lock);
   node_t *tmp = q->head;
   node_t *new_head = tmp->next;
   if (new_head == NULL) {
      phtread_mutex_unlock(&q->head_lock);
      return -1; // queue was empty
   }

   *value = new_head->value;
   q->head = new_head;
   pthread_mutex_unlock(&->head_lock);
   free(tmp);
   return 0;
}
```

### 五、HashTable

- 你可能会出现哈须值冲突 collection 对不对？然后你发生冲突的情况下，它这边采用的是一个链表，把它链出去，
- 并发的哈希表就是通过并发的link-list。
- 所以你进来的时候先确定你要去哪条链，然后再去并发的去访问这条链就行了。

```c
#define BUCKETS (101)

typedef struct __hash_t {
  list_t lists[BUCKETS];
} hash_t

void Hash_Init(hash_t *H) {
   int I;
   for (I = 0; I < BUCKETS; i++) {
      List_Init(&H->lists[i]);
   }
}

void Hash_Insert(hash_t *H, int key) {
   int bucket = key % BUCKETS;
   return List_Insert(&H->lists[bucket], key);
}

void Hash_Lookup(hash_t *H, int key) {
   int bucket = key % BUCKETS;
   return List_Lookup(&H->lists[bucket], key);
}


```


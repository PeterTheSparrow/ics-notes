---
title: 第一节 锁
sidebar_position: 1
---

import OfficePreview from '@site/src/components/OfficePreview/index';

<OfficePreview place = "/ppt/3-15-lock.ppt"/>

## 锁

> 我们实现并行程序里面大量会使用锁，那么我们要关注这些锁是怎么实现的，以及不同锁它的这个表现。最后我们知道性能很大程度上取决于你对于这种共享变量的这个处理，因为不共享的部分大家并行执行都是很好的，性能差的原因往往就是因为共享锁的这个部分。
>
> - Mutex 是一种锁，是一种我们等会介绍的 spin lock
> - 还有Ticket Lock
> - 锁保护的是共享变量，同时也是基于共享变量

### 一、Pthread Locks

#### 1）Basic Idea

- critic section 是要限制说能够进入这个空间的 thread 只有一个来保证那个正确
- 锁从它的名字也能看出来，它就像这个门的锁一样，只有一个人开门进去，只有下等它出来了之后，这个锁才能再有一个人进去，所以它的操作会有上锁和开锁，我们称为 lock 和unlock。一把锁来说，它的状态也有两个，一个叫 unlock 的，一个叫lock。

```c
int pthread_mutex_trylock(pthread_mutex_t *mutex);
int pthread_mutex_timedlock(pthread_mutex_t *mutex,
			         struct timespec *abs_timeout);
```

- trylock是立即返回的，如果没有拿到锁
- timedlock会等一段时间然后看，超时了就退出

#### 2）评价锁的好坏

- 第一个，正确性，它能不能正确的提供 mutual exclusive 或者exclusion，能不能实现排他就是不是正确。
- 第二个，公平性，会考虑说它是不是一个公平的锁，公平的锁就是有没有先来后到，会不会出现，有的人就是抢不到这把锁，出现starvation。比如具体的方法是：可以按照谁抢的快，谁先得到锁，也可以按照谁先来就谁获得
- 第三个，性能，判断依据就是性能，我拿锁的性能如何？同样一个程序可以有并行和串行的两个版本，后者可能性能较好，但是前者更安全

#### 3）单线程的锁

- 我们知道操作系统本身就是个最大的并发的这个程序，虽然他都是他没有多开多线程，但是它里面会有中断，来的时候随时会被打断，最典型的就是 signal handle 了，当时就介绍过一些关闭 signal 因为你不关闭signal，你可能会被打断，调用就会出错。
- 例如下面两个函数关闭了中断

```c
void lock() {
 	DisableInterrupts();
}
void unlock() {
 	EnableInterrupts();
}

```

- 第一个它在多进程底下是不工作的，因为你关了中断只是你当前的这个，另外的thread上面还是会执行，不能支持多核
- 第二个不能关中断太长了，如果再重复来signal，你可能会丢包，如果有其他的硬件的重要的事情，你可能通知不到，

#### 4）锁的实现一  纯代码（错误）

- 加锁就是把flag设置为1。如果已经被加锁了，就会进入死循环状态
- 解锁就是把flag设置为0

```cpp
typedef struct __lock_t { int flag; } lock_t;

void init (lock_t *mutex) {

   mutex->flag = 0; // 0 -> lock is available, l -> held

}

void lock (lock_t *mutex) {
	// 这种就是忙等待，一直进入死循环
   while (mutex->flag == 1) ; // spin-wait (do nothing)
   mutex->flag = 1; // now SET it!

}

void unlock(lock_t *mutex) { mutex->flag = 0; }
```

- 上面的程序有问题。理由如下：假设当前锁是处于锁着的状态， 一个 thread 过来的时候，他会在这边 while 准备等等，等的时候那个 thread 走了，他 unlock 掉了，那么这个时候他是不是从 while 里面出来了。如果这个时候发生了， content switch，切换到Thread 2 上面去执行 Thread 2，他也去拿锁，正好拿锁，那么他是不是也会通过这个 while 1 去检查这个，这个 flag 是 0 是不是就通过了。
- 所以这时候两个线程就同时进入了危险区。出现问题的根本就是这个函数执行到一半被打断了！所以我们需要一种机制保证这个函数原子性执行
- 性能：此外，while循环的性能也会收到影响。浪费CPU。
- 公平性：谁运气好，谁正好执行到这一句出来才能抢到，并没有任何的保证。
- 为了解决原子性的问题：如下代码，在不同的机器有相关的质量，能够保证原子性执行

```cpp
int TestAndSet(int *old_ptr, int new) {
   int old = *old_ptr;  // fetch old value at old_ptr
   *old_ptr = new;      // store ‘new’ into old_ptr
   return old;          // return the old value
}
```


#### 5）锁的实现二 TestAndSet

- 下面的程序保证了锁的正确性！性能问题没有被解决，公平性也还是传统的
- unlock 没关系，因为 unlock 是没有人一起去执行的，因为 unlock 是从 critical section 里面出来
- 这个需要硬件支持test and set

```cpp
typedef struct __lock_t { int flag; } lock_t;

void init (lock_t *lock) {
   lock->flag = 0; // 0 -> lock is available, l -> held
}

// TestAndSet会尝试把flag设置为1，并返回原来的
// 如果锁没被设置，就会返回0，直接退出循环
// 如果锁已经被设置了，就会返回1，继续死循环
void lock (lock_t *lock) {
   while (TestAndSet(&lock->flag, 1) == 1)
      ; // spin-wait (do nothing)
}

void unlock(lock_t *lock) { lock->flag = 0; }
```


#### 6）锁的实现三 纯软件

- 如果硬件不支持上面的那些指令，怎么办呢，可以通过软件实现锁。
- 为每一个 thread 去定义一个flag，然后每一个 thread 都是设自己的设置自己的这个flag，但是他会去检查其他人的flag。
- 这边的想法是大家去 set 这个flag，你 set 这个 flag 的同时去看一下有没有人和你一块set，如果你检查到其他人也 set 了，大家再从头再来。
- 注意：它是先设置自己的，然后检查所有的有没有别人设置了

```cpp
typedef struct __lock_t { int flag; } lock_t;

int flag[N] ;//one flag per thread

int TestAndSet(lock_t Lock) {  //set lock and return old value
    int ret;
    while (1) {       //me is my index in flag
	  flag[me] = 1 ;       //warn other threads
	  if (AnyoneElseInterested(me))//is other thread warning us
		  flag[me] = 0 ;     //yes, reset my warning, try again
	  else {
		  ret = Lock.flag ;  //set ret to value of Lock
		  Lock.flag = 1 ;  //and set the Lock
		  flag[me] = 0 ;
		  return ret ;
	  }
    }
}

int AnyoneElseInerested(int me) {//is another thread updating Lock?
    for (i =0 ; i< N ; i++ )
	  if ( i!= me && flag[i] == 1)
      return 1 ;
    return 0 ;
}
```

- 有人可能想会不会出问题，总之只有下面的三种情况
- 最坏的情况是第三种，两个人都没有拿到锁，这时候会退出，直到有一方通过Case1或者2拿到了锁
- 性能可能比较差，可能出现Case3的情况，这种方法仅供了解

```
–Case-1:
A:   Set flag[A], Read flag[B], -------------------
B:   ------------------------------, Set flag[B], Read flag[A]

–Case-2:
A:   -----------------------------, Set flag[A], Read flag[B]
B:    Set flag[B],  Read flag[A], --------------------

–Case-3:
A:  Set flag[A], ------------------------------, Read flag[B]
B:    -------------, Set flag[B], Read flag[A], ---------------
```

#### 7）自旋锁评估

- 正确性：是一个正确的锁
- 公平性：它没有考虑任何的公平性，可能出现死锁
- 性能：单个CPU可能会很差


#### 8）锁的实现四 CompareAndSwap

- 指令CompareAndSwap：它要比 test and set 效率高一点。test and set 它其实并没有分支，总是要 set 的。这个会做一个判断，保证只有当和你的预期一样的时候，才会设置锁。
- 现在效率更高了，原来不断的读写，现在会经过一个判断，才会设置

```cpp
int CompareAndSwap(int *ptr, int expected, int new) {
   int actual = *ptr;
   if (actual == expected)
	   *ptr = new;
   return actual;
}


void lock(lock_t *lock) {
	while (CompareAndSwap(&lock->flag, 0, 1) == 1)
	; // spin
}
```


#### 9）锁的实现四 Load-Linked

- 给了两个接口，一个叫做 load link，一个叫做 store conditional。
- 这个 load link 是去读一个值，然后这个 store 的 conditional 这条指令，它是两条指令，这条指令会去判断。当然是由硬件完成的
- 他去看我之前提供了这个地址，在我现在马上要设置它的时候和我当时之前一次读之间没有发生任何修改，我这个设置才会成功

```cpp
int LoadLinked(int *ptr) {
	return *ptr;
}

// 这些都是硬件实现的，这里只是伪代码
int StoreConditional(int *ptr, int value) {
   if (no one has updated *ptr since the LoadLinked to this address) {
   *ptr = value;
	   return 1; // success!
   } else {
	   return 0; // failed to update
	}
}

void lock(lock_t *lock) {
 	while (1) {
 		while (LoadLinked(&lock->flag) == 1)
 			; // spin until it’s zero
 		if (StoreConditional(&lock->flag, 1) == 1)
 			return; // if set-it-to-1 was a success: all done
 		// otherwise: try it all over again
 	}
 }

 void unlock(lock_t *lock) {
 	lock->flag = 0;
}

void lock(lock_t *lock) {
while (LoadLinked(&lock->flag)        
          ||!StoreConditional(&lock->flag, 1))
 	; // spin
}
```

- 我去不断的读锁的值，我去读到 1 的话就继续读，当我读到 0 的时候马上出来，然后尝试把它设置成1
- 但是这个 store 有一个条件：就是我读的时候再去写，中间没有其他的人，这个其他的 thread 去设置过，它就没有其他的 store 指令，那么是不是这两个就变成了一个原子操作了！
- 这个和compare 和 swap差不多，因为有些时候机器原因是没办法实现这个compare and swap的。CPU 的指令它是有 license 的，是有版权的
- 到目前为止我们的所有的锁都是spin lock，都是效率不好的，while循环检查，没有任何的公平性的考虑。但是反而在内核里面，spin lock用的是最多的！最重要的原因就是它的实现非常的简单，有看到它的存储开销就只有一个！指令非常的少！如果线程不是很多，那完全合适！


### 二、Ticket Locks

> SpinLock相当于一群十几个人挤在一个窗口去打饭，怎么提高效率呢？
> 那我们就考虑可不可以在这个 lock 门口去排队啊？但是这个开销就很大了，需要一个数据结构来维护。所以我们用TicketLock。它里面其实是需要所谓的 ticket 是有一个票或者有个号，因为现在大家知道这个你去饭店里面吃饭没有位置，排队的时候他不会让你排在门口的，所以它的本质其实是一种叫号的方式，去明确的指定下一个是谁。


#### 1）锁的实现

- Ticket Locks它其实就两个部分， lock 的时候其实是去拿一个号，然后在那边等叫号，而出来的那个人其实是代表要去叫下一个号，那么它需要一个，它同样也需要这个原子指令的支持。 
- 它很重要的一点就是 fetch and add 这条指令，这也是一条原子指令，它的功能就是某一个内存地址我返回旧的值把它加1。

```cpp
int FetchAndAdd(int *ptr) {
   int old = *ptr;  // fetch old value at ptr
   *ptr = old + 1;  // add 1 and store ‘new’ into ptr
   return old;      // return the old value
}
```

- Ticket锁需要的数据结构是

```cpp
typedef struct __lock_t {
	// 初始的时候都是0，代表什么呢？代表当前的号以及排队排到多少，
	int ticket;
	int turn;
} lock_t;
```

- 所以对于 lock 来说，他就是上来先去拿到自己的号，就是这个 turn 能轮到第几个。它其实就是在原来的这个 ticket 的这个基础上去加1，并且加 1 就是为了下一个人拿。为什么要用原子指令？防止一两个人或者多个人拿到相同的一个号码
- 加锁的方法非常简单，只需要通过FetchAndAdd拿到一个属于自己的号码，然后等待
- 如果等到发现轮到自己啦！那就开始执行
- 会不会出现overflow，一般不太会，不可能有那么多线程在拿！

```cpp
void init (lock_t *lock) {
   lock->ticket = 0;
   lock->turn   = 0;
}

void lock (lock_t *lock) {
   int myturn = FetchAndAdd(&lock->ticket);
   while (lock->turn != myturn) 
      ; // spin
} 

void unlock(lock_t *lock) { lock->turn = lock->turn + 1; }
```


- 评估这个锁：首先考虑到了先到先得的这种公平性质问题，保证了没有startvation饥饿的发生。但是他并没有解决spin wait的问题，从本质来说，还是一个死循环的方式。所以和之前的性能方面没有太大差别。当然这个锁比较复杂，数据结果也比之前占用的空间更大。当然正确性是有的！

#### 2）spin问题

最好的一个想法就是你抢不到这个的这个情况下，那你把 CPU 让给别人。主动放弃CPU， OS 提供了这样的一个，你可以认为 system call，你也可以认为它其实就是一条指令去主动释放CPU。当前thread，我可以主动触发 content switch 。这个就是 `yield()` ，就把 CPU 释放掉，它是操作想提供的它其实也你也可以看到它有相应的这个对应的这个指令。把当前的这个 thread 从 range 状态进入到 ready 状态，那么我们这个就知道了，他这个就不会马上被调度

如果你只是简单的yield掉CPU，下一个时间片还可能会轮到你。最好的一种方案其实是最节省的方案是你放掉了之后，等你轮到了或者有人放锁了之后来通知你。所以：一般情况下是有两个操作一块用的，一个你可以认为是sleep，或者说这个去睡了yield。另外有一个通知机制，就是有一个 awake 的，这个机制什么时候调awake，大家想到就是在 unlock 的时候，你可以调 awake ！


优点是可以避免CPU的占用，缺点：他会引入额外的overhead。频繁的出现这个 content switch on switch 这个情况，可能开销反而变大。仍然有可能会出现Starvation，有仍然可能会出现Starvation，因为最终能不能抢到锁还是要抢的，他只是说在抢不到的情况下大家会放弃执行。当你UnLock之后，大家还是一块来抢。

这样之后，如下代码所示。抢锁一旦失败，那就是放弃自己线程的执行，让出去。

```cpp
void init () { flag = 0; }

void lock () {
   while (TestAndSet(&flag, 1) == 1) 
      yield(); // give up the CPU
} 

void unlock() { flag = 0; }
```

- 问题：代码肯定是有问题，你会发现他如果去要的就是没有人叫醒他，怎么办，然后他这个 test set 如果这边也有中间被打断了怎么办？
- 我们先不管这个正确项，我们来看这个效率怎么样？这个效率的话，如果是两个线程，它的效率其实是比较好的，我抢不到当然就给拿锁的人执行，他执行完了到我再拿锁成功再执行！效率很高！
- 但是如果你有100个线程。那你就会发现你需要过一遍你 content switch。如果大家都是相同的调度的机会的话，你会发现 99% 都是在执行 content switch，明明拿不到的锁的人，他还是要去尝试拿一下，然后再自己主动yield掉
- 所以更好的一个想法是我们有一个队列，队列里面就是我们能够明确的知道应该叫醒谁！如果我们有了队列的话，我们就可以显示的去选择了。缺点：数据结构越来越复杂了！

#### 3）两个函数

- 一个叫做 park，和前面数的yield有一些一样的地方，就类比停车
- 另外一个叫做Unpark，相当于叫醒某一个人

```cpp
Park()// put a calling thread to sleep
Unpark(threadID)// wake a particular thread
```


#### 4）更高级的锁

##### a）数据结构

- q就是维护的等待的队列
- gurad：原来的这个指令，你这个 lock 指令和 unlock 指令，它里面其实只有那些原子操作的，但现在一个 lock 里面你肯定有很多操作，不但是要去改flag，还要去修改 q 之类的，而这些操作本身是不能被打乱的。而 lock 函数里面可能有几十条上百条的指令，它们之间如果出现交错，就很麻烦。所以这个 guard 是用来保护 lock 里面的指令本身的这个原子性。【总结：guard用来保护这个锁，锁再来保护更大的对象。用一把锁在这个门上面，锁保护门，门保护房间，比如一个数据库的大的表。】
- 初始化的时候把它们都设成 0 以及空的队列。

```cpp
typedef struct __lock_t { 
  int flag;
  int guard;
  queue_t *q;
} lock_t;

void lock_init (lock_t *lock) {
   lock->flag  = 0;
   lock->guard = 0;
   queue_init(lock->q);
}
```


##### b）加锁

- 通过guard这个变量，保护里面的操作的原子性，不可分割。所以它是一个基于自旋锁的。
- 如果没有上锁，那么获取锁，把flag设置为1
- 否则，把他加入到等待的队列里面。然后睡觉！开摆！
- 值得注意的是gurad要记得恢复。比如park之前，还需要把gurad放开，才能进去

```cpp
void lock (lock_t *lock) {
   while (TestAndSet(&lock->guard, 1) == 1) 
      ; // acquire guard lock by spinning
   if (lock->flag == 0) {
      lock->flag = 1; // lock is acquired
      lock->guard = 0;
   } else {
	   // 获取线程的ID，然后放入队列
      queue_add(lock->q, gettid());
      lock->guard = 0;
      park();
   }
} 
```

##### c）解锁

- 解锁的整个函数还是要一个gurad来保护的。和上面一样。也就是说gurad保护加锁、解锁不能同时执行
- 如果发现队列为空，那么就把flag设置为0
- 如果发现不是空的，就主动调度下一个等待的线程

```cpp
void unlock (lock_t *lock) {
   while (TestAndSet(&lock->guard, 1) == 1) 
      ; // acquire guard lock by spinning
   if (queue_empty(lock->q)) {
      // let go of lock; no one wants it
      lock->flag = 0; 
   } else {
      // hold lock (for next thread!)
      // 通知这个人出来
      unpark(queue_remove(lock->q)); 
   }
   lock->guard = 0;
} 

```


##### d）问题

大问题就出现在这一句话。其实刚刚就已经感觉到了。你首先是吧gurad这个锁释放掉。然后再执行的park。假设出现执行完成`lock->guard = 0;`这一句话之后，上下文切换出去了，然后这时候因为guard已经被解开了，所以可以执行unlock。如果unlock里面的unpark唤醒的就是执行lock的这个线程，那就会出现：**先执行unpark，再执行park的问题！寄了！**

所以我需要保证下面的两个指令同时执行！

```cpp
      lock->guard = 0;
      park();
```

现在，我们需要一个函数setpark()。表示了在调用 setpark 之后，到你真的去调用unpark的之间有没有人调过一个unpark的操作。所以解决方法就是这样

```cpp
setpark()
// After calling it, Park will return immediately instead of sleeping if another thread just finished unpark()
```

所以，正确的解决方法就是：

```cpp
void lock (lock_t *lock) {
   while (TestAndSet(&lock->guard, 1) == 1) 
      ; // acquire guard lock by spinning
   if (lock->flag == 0) {
      lock->flag = 1; // lock is acquired
      lock->guard = 0;
   } else {
      queue_add(lock->q, gettid());
      setpark();
      lock->guard = 0;
      park();
   }
} 

```

#### 5）futex

##### a）基于函数

- 是当前实现效率比较高的一种Linux的锁。因为刚才介绍的这些这个设计的数据结构有队列，很复杂。结果就是如果线程本身执行的不是说很复杂，可能锁的操作带来的指令比保护的东西更复杂的多。
- 这个和之前的park和unpark差不多，只不过是通过内存地址来实现共享的。前面的park和unpark本质是通过消息机制的，消息机制在操作系统里面是通过进程间通信 pic 的方式，这个效率比较低。这个是通过一个内存地址的方式

```cpp
futex_wait(address, expected) 
// If *address == expected, puts the calling thread to sleep
// If not, the call return immediately
// 这个是等待一个预期的值，当前 sleep 
futex_wake(address)
// Wake one thread that is waiting on the queue
// 当这个地址被设置的时候，它会醒过来
```

##### b）锁的实现

- 这个锁的实现没有队列，它也支持多个人等待，但是它没有像队列这样有很好的公平性质。它这边是一个 32 个 bit 的一个 Int 值，然后它把这 32 bit Int 值分成两部分。
- lock 本身的这个 flag 只需要一个 bit 在最高位，这一个 bit 就代表了锁和没锁。那么剩下的 31 个 bit 用来记录当前有多少的 thread 在等待，它可以支持最多 2 的 31 次的 thread 在里面等
- 所以我们把这个int变量的前面一个bit叫做lock，后面叫做counter
- 如下所示，首先atomic_bit_test_set检测的就是我上面说的这个mutex的最高的位，是不是0。如果是0就会把他设置为1，然后返回。结束【这就体现出来优点！如果只有一个线程，开销非常小，想想上面的代码里面，队列的操作，所以这种很简洁】
- 如果原来的不是0，那么进入到等待。等待之前atomic_increment (mutex); 会把这个int变量的数值加1。

```cpp
void mutex_lock (int *mutex) {
   int v;

   if (atomic_bit_test_set(mutex, 31) == 0) return;
   atomic_increment (mutex);  // add counter
   while (1) {
	// 你可以认为他不太死心，他觉得我执行完这个 atomic ink 了之后
	// 已经过去了一段时间了，可能这个时候运气好，成功拿到了锁
      if (atomic_bit_test_set(mutex, 31) == 0) {
	      // 这时候要记得减一！拿到锁马上走
         atomic_decrement(mutex);
         return;
      }
      // 进入休息
      v = *mutex;
	  // v大于0，什么情况？大于0代表mutex这个int的最高位已经被设置为0
	  // 也就是说锁已经被释放，说明还是不死心，还想拿
      if (v >= 0) continue; // lock has released
      futex_wait(mutex, v);
    }
}
```

- 放锁的操作很复杂。加了一个这样的数字。为了不影响后面的数字，也就是说直接把mutex的最高位也就是符号位，设置位0
- 解锁之后发现如果是0，直接return。如果发现不是0，说明有人需要这个被唤醒。
- 更多的情况下是你解了锁了之后，你去叫wake，之间可能有人拿到锁了。但是结果就是被你叫醒的那个人从这里面出来了，他再去尝试，但他可能没拿到锁，继续睡觉。所以不会出错。
- 这是一种很积极的策略，就是我要叫的时候都叫，叫了之后有没有用我不管，可能叫醒了马上又去睡觉了

```cpp
void mutex_unlock (int *mutex) {
   /* Adding 0x80000000 to the counter results in 0 if and
      only if there are not other interested threads */
   if (atomic_add_zero(mutex, 0x80000000))
      return;

   /* There are other threads waiting for this mutex,
      wake one of them up. */
   futex_wake(mutex);
}
```


##### c）锁的两个阶段

- 阶段1是spin的while循环，尝试拿到锁
- 阶段2是调用者被强制休眠，睡觉，等待被唤醒
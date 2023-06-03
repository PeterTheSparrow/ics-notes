---
title: 第三节 条件变量
sidebar_position: 2

---

import OfficePreview from '@site/src/components/OfficePreview/index';

<OfficePreview place = "/ppt/3-17-cv-new.ppt"/>

## 第三节 条件变量

> 下面我们介绍这个 conditional variable，那么这也是并发程序里面用的非常多的一种。我们知道之前我们介绍的是 lock，但 lock 它只是用来保护 critical section 的存在， lock 都是出现critical section 的前后这样的一个情况。对，但还有一些并发的程序它并不是要保护，说一段代码只能用一个 spread 进去的这个语义，它的语义是两个 thread 之间要有个同步，要等你做完一些事情之后我才来做。
>
> 比如说你这边 Malloc 完了，我才能用这个 point 继续去做，那么这也是一种同步。但是它控制的并不是多少人能够同时使用，控制的是使用它的这个先后这样怎么做。在pthread库里面用的条件变量来实现的。它适用的场景往往是某些条件满足了之后，你的程序才能够执行下去，它支持的是这种语义。

### 一、举例子

- 如下面的代码所示，我们希望它的打印是这个样子的，就是 parent 先打出一个begin，然后它创建了线程，然后我们希望这个线程的 child 打印了出来之后，再最后打印这个parents，也就是说这个父进城要等一下子进程。
- 我们又不想用 join 的这种函数来实现，因为 join 本身也其实是一种基于 CV 的这个实现。
- 这种情况就是一种同步，就是主线程和子线程之间的一个同步。你如果没有控制的话，这两个打印的顺序可能会有变化。如果我们一定要把它固定下来，那么我们就需要额外的这个操作。

```c
int main(int argc, char *argv[]) {
 	printf("parent: begin\n");
 	pthread_t c;
 	Pthread_create(&c, NULL, child, NULL); // create child
 	// XXX how to wait for child?
 	printf("parent: end\n");
 	return 0;
}
```

- 一种实现方法就是通过条件变量，当done等于1的时候，那么我们就退出死循环

```c
volatile int done = 0; // 注意volatile关键字

void *child(void *arg) {
 	printf("child\n");
	 done = 1;
 	return NULL;
}

int main(int argc, char *argv[]) {
 	printf("parent: begin\n");
 	pthread_t c;
 	Pthread_create(&c, NULL, child, NULL); // create child
 	while (done == 0)
 		; // spin
 	printf("parent: end\n");
 	return 0;
}
```

- 这种实现的不一定高效。我们希望替代的方案是等的那个人能够去sleep。我们希望的是等的人会进入到sleep，当你条件满足了之后，主动的去通知他，主动通知他，这样就实现了一个更高效的一个CV。

### 二、CV定义

- CV 这所谓的 conditional variable，它可以是一个显式的一个队列，因为你在这边等的人可能会比较多，所以我们一般用过队列来进行管理。当等的人的条件没有满足之前，他的 thread 就会被放到这个队列里面去等待wait。
- 所以这个 CV 也会有个共享变量，就像 lock 内部会有数据结构一样，这个 CV 内部也会有一个肯定是，然后还会有队列去管理它，当你的条件满足了，状态发生变化了，你这个等待的这个条件满足了之后，他会去叫醒队列里面的人，你可以叫醒所有，也可以叫醒一个。但你都需要去叫醒。叫醒的方式可以采用 signal 等等一些实现
- Pthread里面提供了两套接口，一个是wait，一个是signal，

```c
pthread_cond_wait(pthread_cond_t *c, pthread_mutex_t *m);
pthread_cond_signal(pthread_cond_t *c);
```

- pthread_cond_wait函数会接受mutex变量作为锁，当wait在被调用之前的时候，mutex是被锁上的。pthread_cond_wait的功能会把这个锁解锁，然后把调用这个线程的人放去睡觉。这两个操作是 atomic 是在这个操作里面保证了原子性。
- 当这个线程被叫醒的时候，他必须重新获得这个锁，然后返回调用者
- 还是看下面的例子

```c
int done = 0;
pthread_mutex_t m = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t c = PTHREAD_COND_INITIALIZER;

void thr_exit() {
 	Pthread_mutex_lock(&m);
 	done = 1;
 	Pthread_cond_signal(&c);
 	Pthread_mutex_unlock(&m);
}

void *child(void *arg) {
 	printf("child\n");
 	thr_exit();
 	return NULL;
}


// 注意：这个里面还是有done == 0的判断
// 为什么需要done，假如先执行了子线程，done这时候直接等于1
// 这个时候根本不需要睡觉，直接就可以解锁了

// 再说为什么需要这个mutex，如果执行到了while (done == 0)之后
// Pthread_cond_wait(&c, &m);之前，然后收到了子线程的叫醒的信号
// 这个时候就会出现大问题，然后主线程马上就会睡觉，永远没人叫醒
// 所以我要保护这个区域，进来之前把锁锁上，子线程就进不去，然后等我开始睡觉之前
// 把锁放开，这样就好了
void thr_join() {
 	Pthread_mutex_lock(&m);
 	while (done == 0)
 		Pthread_cond_wait(&c, &m);
 	Pthread_mutex_unlock(&m);
}

// 主函数创建线程之后，调用一个join函数
int main(int argc, char *argv[]) {
 	printf("parent: begin\n");
 	pthread_t p;
 	Pthread_create(&p, NULL, child, NULL);
 	thr_join();
 	printf("parent: end\n");
 	return 0;
}
```

- 特别注意：thr_join的函数里面done变量和锁两个设计是缺一不可的

### 三、生产者消费者问题

- 先看基础版本的代码
- 这个肯定有问题，不支持并发。

```c
int buffer;
int count = 0; // initially, empty
// counter就是一个标识buffer里面是不是空的变量
// 整个buffer就是一个元素，

void put(int value) {
 	assert(count == 0);
 	count = 1;
 	buffer = value;
}

int get() {
 	assert(count == 1);
 	count = 0;
 	return buffer;
}

```

- 对于生产者来说，如果发现count是1，那么他里面就会睡觉，然后等待被叫醒

```c
cond_t cond;
mutex_t mutex;

void *producer(void *arg) {
 	int i;
 	for (i = 0; i < loops; i++) {
 		Pthread_mutex_lock(&mutex); 		// p1
 		if (count == 1) 								// p2
 		      Pthread_cond_wait(&cond, &mutex); 	// p3
 		put(i); 												// p4
 		Pthread_cond_signal(&cond); 		// p5
 		Pthread_mutex_unlock(&mutex); 	// p6
 	}
}

```

- 对于消费者来说。他也是去 check 这个counter，康特为0，代表没东西，他也去sleep，然后他再去取，意味着我从 sleep 里面出来的时候被唤醒的情况下肯定有东西了。他假设，所以我就可以去get，他 get 完了之后我要去叫醒，因为我已经拿走了，我就应该去叫醒。

```c
void *consumer(void *arg) {
 	int i;
 	for (i = 0; i < loops; i++) {
 		Pthread_mutex_lock(&mutex); 		// c1
 		if (count == 0) 								// c2
 		      Pthread_cond_wait(&cond, &mutex); 	// c3
 		int tmp = get(); 								// c4
 		Pthread_cond_signal(&cond); 		// c5
 		Pthread_mutex_unlock(&mutex); 	// c6
 		printf("%d\n", tmp);
 	}
}
```

- 它的这个设计是这样，我 put 一个叫醒你这个consumer， consumer 拿走了，他在叫醒我这个 producer 再去做，来来回回这样它的这个设计是这个样子，就是 consumer 和 producer 丢替执行
- 这个代码如果你只有一个 producer 和一个 consumer 好，其实是没问题的。
- 但是如果我有多个 producer 和 consumer 会怎么样？我们这边来看一下，这是个执行序列，我有两个 consumer 和一个producer。
- 假设consumer1先执行，尝试消费的时候发现buffer是空，所以直接睡觉，然后producer生产了一个，生产完了就叫醒consumer1和consumer2，但是实际上操作系统这时候假如调度了consumer2，consumer2消费完成了，这时候counter应该是0，代表buffer是空，然后consumer1被调度出来之后又去消费了一次。

![截屏2023-06-03 14.50.52](./3-condition-var.assets/%E6%88%AA%E5%B1%8F2023-06-03%2014.50.52.png)

![截屏2023-06-03 14.51.06](./3-condition-var.assets/%E6%88%AA%E5%B1%8F2023-06-03%2014.51.06.png)

- 这时候就涉及到Mesa Semantics和Hoare semantics
  - Hoare semantics他保证的是说你睡觉前期望的这个结果在被叫醒的时候看到的情况下是不变，一定是保证他仍然仍然没有变化，但这种是很难实现的。但这种是很难实现的。你并不知道它这个叫醒它能确定的叫到你，叫醒之后可能过了一会才执行。大部分现在的系统几乎全部都是实现的，是 mansas mentings， 我们这个代码就是简单的这个 if 就过了。
  - 所以我们要用while循环，不断的判断，

- 但是用了while照样会挂，如果是下面的执行顺序，三个线程最终全部去睡觉了

![截屏2023-06-03 14.58.12](./3-condition-var.assets/%E6%88%AA%E5%B1%8F2023-06-03%2014.58.12.png)

![截屏2023-06-03 14.59.03](./3-condition-var.assets/%E6%88%AA%E5%B1%8F2023-06-03%2014.59.03.png)

- 上面问题的本质是叫错了人，消费者1叫醒了消费者2，结果最终三个人全部都去睡觉了
- 正确的实现就是我们要区分 signal 要用两个 empty 和feel， consumer 叫 producer 的是empty，而这个 producer 去叫 consumer 用的是fill，这样就不会叫错了。

```c
cond_t empty, fill;
mutex_t mutex;

void *producer(void *arg) {
 	int i;
 	for (i = 0; i < loops; i++) {
 		Pthread_mutex_lock(&mutex); 
 		while (count == 1) 	
 		      Pthread_cond_wait(&empty, &mutex); 	
 		put(i); 
 		Pthread_cond_signal(&fill); 
 		Pthread_mutex_unlock(&mutex); 
 	}
}

cond_t empty, fill;
mutex_t mutex;

void *producer(void *arg) {
 	int i;
 	for (i = 0; i < loops; i++) {
 		Pthread_mutex_lock(&mutex); 
 		while (count == 1) 	
 		      Pthread_cond_wait(&empty, &mutex); 	
 		put(i); 
 		Pthread_cond_signal(&fill); 
 		Pthread_mutex_unlock(&mutex); 
 	}
}

```

- 最后如果是buffer需要支持多个的怎嘛办？刚刚只能支持一个？
- 只要修改的是 get 和 put 函数，只要把 get 和 put 函数改掉就行了。外面这个不需要，就外面这个通知机制是不需要修改的

```c
int buffer[MAX];
int fill_ptr = 0;
int use_ptr = 0;
int count = 0;

 void put(int value) {
     buffer[fill_ptr] = value;
     fill_ptr = (fill_ptr + 1) % MAX;
     count++;
}

int get() {
     int tmp = buffer[use_ptr];
     use_ptr = (use_ptr + 1) % MAX;
     count--;
     return tmp;
}
```

### 四、广播叫醒人

- 举个例子，内存分配
- free的时候，我们可能会叫醒一些人，如果我只叫醒了一个人，但是我free的空间比较小，但是叫醒的这个人需要的空间比较大，这就比较亏，这个人被叫醒了之后发现还是拿不到内存空间

```c
// how many bytes of the heap are free?
int bytesLeft = MAX_HEAP_SIZE;

// need lock and condition too
cond_t c;
mutex_t m;

 void * allocate(int size) {
 	Pthread_mutex_lock(&m);
 	while (bytesLeft < size)
 	        Pthread_cond_wait(&c, &m);
 	void *ptr = ...; // get mem from heap
 	bytesLeft -= size;
 	Pthread_mutex_unlock(&m);
 	return ptr;
}

void free(void *ptr, int size) {
 	Pthread_mutex_lock(&m);
 	bytesLeft += size;
 	Pthread_cond_signal(&c); 
 	Pthread_mutex_unlock(&m);
}

```

- 所以这时候就需要广播函数：`Pthread_cond_broadcast()`，他会叫醒所有的人
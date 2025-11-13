import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/shared/lib/monitoring/logger';

interface MetricData {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp?: string;
}

interface LogData {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  context?: Record<string, any>;
  timestamp?: string;
}

/**
 * API endpoint for collecting custom metrics and logs
 * Used for client-side monitoring and custom telemetry
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({
        error: 'Missing required fields: type and data'
      }, { status: 400 });
    }

    switch (type) {
      case 'metric':
        return handleMetric(data as MetricData);
      
      case 'log':
        return handleLog(data as LogData);
      
      case 'performance':
        return handlePerformance(data);
      
      case 'business':
        return handleBusiness(data);
      
      default:
        return NextResponse.json({
          error: `Unknown telemetry type: ${type}`
        }, { status: 400 });
    }
  } catch (error) {
    logger.error('Failed to process telemetry data', error instanceof Error ? error : new Error(String(error)));
    
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

function handleMetric(data: MetricData): NextResponse {
  try {
    logger.metric(data.name, data.value, data.unit, data.tags);
    
    return NextResponse.json({
      success: true,
      message: 'Metric recorded'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to record metric'
    }, { status: 500 });
  }
}

function handleLog(data: LogData): NextResponse {
  try {
    const context = {
      component: 'client',
      ...data.context
    };

    switch (data.level) {
      case 'error':
        logger.error(data.message, undefined, context);
        break;
      case 'warn':
        logger.warn(data.message, context);
        break;
      case 'info':
        logger.info(data.message, context);
        break;
      case 'debug':
        logger.debug(data.message, context);
        break;
      default:
        logger.info(data.message, context);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Log recorded'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to record log'
    }, { status: 500 });
  }
}

function handlePerformance(data: any): NextResponse {
  try {
    logger.performance({
      name: data.name,
      duration: data.duration,
      startTime: data.startTime || Date.now() - data.duration,
      endTime: data.endTime || Date.now(),
      metadata: data.metadata
    });
    
    return NextResponse.json({
      success: true,
      message: 'Performance metric recorded'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to record performance metric'
    }, { status: 500 });
  }
}

function handleBusiness(data: any): NextResponse {
  try {
    logger.business({
      event: data.event,
      userId: data.userId,
      properties: data.properties,
      timestamp: data.timestamp || new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      message: 'Business metric recorded'
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to record business metric'
    }, { status: 500 });
  }
}

/**
 * GET endpoint for retrieving system metrics
 */
export async function GET(): Promise<NextResponse> {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024), // MB
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
        external: Math.round(process.memoryUsage().external / 1024 / 1024) // MB
      },
      environment: process.env.NODE_ENV,
      version: process.version,
      platform: process.platform,
      pid: process.pid
    };

    return NextResponse.json(metrics);
  } catch (error) {
    logger.error('Failed to retrieve system metrics', error instanceof Error ? error : new Error(String(error)));
    
    return NextResponse.json({
      error: 'Failed to retrieve metrics'
    }, { status: 500 });
  }
}
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-order-timeline',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="order-timeline">
      <h6 class="timeline-title mb-3">
        <i class="bi bi-clock-history me-2"></i>
        Order Progress
      </h6>
      
      <div class="timeline-container">
        <div class="timeline-line"></div>
        
        <div *ngFor="let stage of orderStages; let i = index" 
             class="timeline-item"
             [class.active]="isActiveStage(stage)"
             [class.completed]="isCompletedStage(stage)">
          
          <div class="timeline-marker">
            <i [class]="getStageIcon(stage)"></i>
          </div>
          
          <div class="timeline-content">
            <div class="stage-name">{{ getStageDisplayName(stage) }}</div>
            <div class="stage-description">{{ getStageDescription(stage) }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .order-timeline {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }

    .timeline-title {
      color: #495057;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .timeline-container {
      position: relative;
      padding-left: 30px;
    }

    .timeline-line {
      position: absolute;
      left: 15px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #dee2e6;
      z-index: 1;
    }

    .timeline-item {
      position: relative;
      margin-bottom: 25px;
      display: flex;
      align-items: flex-start;
    }

    .timeline-item:last-child {
      margin-bottom: 0;
    }

    .timeline-marker {
      position: absolute;
      left: -30px;
      top: 0;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #dee2e6;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
      transition: all 0.3s ease;
    }

    .timeline-item.completed .timeline-marker {
      background: #28a745;
      color: white;
    }

    .timeline-item.active .timeline-marker {
      background: #007bff;
      color: white;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(0, 123, 255, 0); }
      100% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
    }

    .timeline-content {
      flex: 1;
      padding-left: 15px;
    }

    .stage-name {
      font-weight: 600;
      color: #495057;
      margin-bottom: 4px;
    }

    .timeline-item.completed .stage-name {
      color: #28a745;
    }

    .timeline-item.active .stage-name {
      color: #007bff;
    }

    .stage-description {
      font-size: 0.875rem;
      color: #6c757d;
      line-height: 1.4;
    }

    .timeline-item.completed .stage-description {
      color: #28a745;
    }

    .timeline-item.active .stage-description {
      color: #007bff;
    }
  `]
})
export class OrderTimelineComponent {
  @Input() currentStatus: string = '';

  orderStages = [
    'payment_pending',
    'pending', 
    'designing',
    'ripping',
    'heatpress',
    'cutting',
    'assembly',
    'qc',
    'done'
  ];

  isActiveStage(stage: string): boolean {
    return stage === this.currentStatus;
  }

  isCompletedStage(stage: string): boolean {
    const currentIndex = this.orderStages.indexOf(this.currentStatus);
    const stageIndex = this.orderStages.indexOf(stage);
    return stageIndex < currentIndex;
  }

  getStageIcon(stage: string): string {
    const icons: { [key: string]: string } = {
      'payment_pending': 'bi bi-credit-card',
      'pending': 'bi bi-clock',
      'designing': 'bi bi-palette',
      'ripping': 'bi bi-scissors',
      'heatpress': 'bi bi-fire',
      'cutting': 'bi bi-cut',
      'assembly': 'bi bi-tools',
      'qc': 'bi bi-check-circle',
      'done': 'bi bi-check2-all'
    };
    return icons[stage] || 'bi bi-circle';
  }

  getStageDisplayName(stage: string): string {
    const names: { [key: string]: string } = {
      'payment_pending': 'Payment Pending',
      'pending': 'Order Confirmed',
      'designing': 'Designing',
      'ripping': 'Ripping',
      'heatpress': 'Heat Press',
      'cutting': 'Cutting',
      'assembly': 'Assembly',
      'qc': 'Quality Check',
      'done': 'Completed'
    };
    return names[stage] || stage;
  }

  getStageDescription(stage: string): string {
    const descriptions: { [key: string]: string } = {
      'payment_pending': 'Waiting for payment confirmation',
      'pending': 'Order confirmed and ready for production',
      'designing': 'Creating your custom design',
      'ripping': 'Preparing materials for printing',
      'heatpress': 'Applying heat transfer design',
      'cutting': 'Cutting and shaping materials',
      'assembly': 'Assembling final product',
      'qc': 'Final quality inspection',
      'done': 'Order completed and ready for pickup/delivery'
    };
    return descriptions[stage] || '';
  }
}
